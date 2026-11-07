/**
 * Removes everything from an uploaded image except what is needed to show it: metadata (EXIF with GPS and
 * camera data, XMP, comments, text chunks) and any bytes after the end of the image (a "polyglot" tail).
 * JPEG and PNG are rewritten at the container level, so the pixels stay byte for byte the same (no new
 * compression loss). The EXIF orientation is kept as a minimal EXIF block, because the original is shown
 * to browsers as is and they rotate it by that tag. WebP and AVIF are decoded and encoded again.
 * @module services/imageClean
 */
import sharp from 'sharp'

/** Thrown when the file claims to be an image but its structure is broken. */
export class BadImageError extends Error {}

const JPEG_KEEP_APP = new Set([0xe0, 0xee]) // APP0 JFIF, APP14 Adobe (colour transform of CMYK/YCCK files)

/** Orientation (1..8) from a JPEG APP1 Exif segment payload, or 1. */
function exifOrientation(seg: Buffer): number {
  if (seg.length < 14 || seg.toString('latin1', 0, 6) !== 'Exif\0\0') return 1
  const le = seg.toString('latin1', 6, 8) === 'II'
  if (!le && seg.toString('latin1', 6, 8) !== 'MM') return 1
  const u16 = (o: number) => (le ? seg.readUInt16LE(o) : seg.readUInt16BE(o))
  const u32 = (o: number) => (le ? seg.readUInt32LE(o) : seg.readUInt32BE(o))
  try {
    const ifd = 6 + u32(10)
    const n = u16(ifd)
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12
      if (u16(e) === 0x0112) {
        const v = u16(e + 8)
        return v >= 1 && v <= 8 ? v : 1
      }
    }
  } catch { /* truncated EXIF: no orientation */ }
  return 1
}

/** An APP1 segment holding nothing but the orientation tag. */
function orientationSegment(o: number): Buffer {
  const b = Buffer.alloc(2 + 2 + 6 + 8 + 2 + 12 + 4)
  b.writeUInt16BE(0xffe1, 0)
  b.writeUInt16BE(b.length - 2, 2)
  b.write('Exif\0\0', 4, 'latin1')
  b.write('MM', 10, 'latin1')
  b.writeUInt16BE(42, 12)
  b.writeUInt32BE(8, 14)
  b.writeUInt16BE(1, 18)
  b.writeUInt16BE(0x0112, 20)
  b.writeUInt16BE(3, 22)
  b.writeUInt32BE(1, 24)
  b.writeUInt16BE(o, 28)
  return b
}

/** Rewrites a JPEG: keeps the image data and colour-related segments only, cuts everything after EOI. */
export function cleanJpeg(buf: Buffer): Buffer {
  const out: Buffer[] = [Buffer.from([0xff, 0xd8])]
  let orientation = 1
  let pos = 2
  const fail = () => { throw new BadImageError('Damaged JPEG') }
  const parts: Buffer[] = []
  for (;;) {
    if (pos + 2 > buf.length || buf[pos] !== 0xff) fail()
    const marker = buf[pos + 1]
    if (marker === 0xff) { pos++; continue } // fill byte
    if (marker === 0xd9) { parts.push(Buffer.from([0xff, 0xd9])); break }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { parts.push(buf.subarray(pos, pos + 2)); pos += 2; continue }
    if (pos + 4 > buf.length) fail()
    const len = buf.readUInt16BE(pos + 2)
    if (len < 2 || pos + 2 + len > buf.length) fail()
    const seg = buf.subarray(pos, pos + 2 + len)
    if (marker === 0xe1) orientation = Math.max(orientation, exifOrientation(seg.subarray(4)))
    const isApp = marker >= 0xe0 && marker <= 0xef
    const isCom = marker === 0xfe
    const keepIcc = marker === 0xe2 && seg.toString('latin1', 4, 15) === 'ICC_PROFILE'
    if ((!isApp && !isCom) || JPEG_KEEP_APP.has(marker) || keepIcc) parts.push(seg)
    pos += 2 + len
    if (marker === 0xda) {
      // entropy-coded data: runs until the next real marker (not FF00 stuffing, not RSTn, not fill)
      let end = pos
      for (;;) {
        const i = buf.indexOf(0xff, end)
        if (i < 0 || i + 1 >= buf.length) fail()
        const m = buf[i + 1]
        if (m === 0x00 || (m >= 0xd0 && m <= 0xd7)) { end = i + 2; continue }
        if (m === 0xff) { end = i + 1; continue }
        end = i
        break
      }
      parts.push(buf.subarray(pos, end))
      pos = end
    }
  }
  if (orientation > 1) {
    // after JFIF (which must come first), where EXIF normally sits
    const at = parts.length && parts[0][1] === 0xe0 ? 1 : 0
    parts.splice(at, 0, orientationSegment(orientation))
  }
  return Buffer.concat([...out, ...parts])
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
// Ancillary chunks that affect how the picture looks (colour, transparency, size, animation).
const PNG_KEEP = new Set(['PLTE', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'bKGD', 'pHYs', 'acTL', 'fcTL', 'fdAT', 'cICP', 'mDCV', 'cLLI'])

/** Rewrites a PNG: drops text, EXIF and time chunks and anything after IEND. */
export function cleanPng(buf: Buffer): Buffer {
  const parts: Buffer[] = [PNG_SIG]
  let pos = 8
  let sawEnd = false
  let first = true
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('latin1', pos + 4, pos + 8)
    const end = pos + 12 + len
    if (end > buf.length) break
    if (first && type !== 'IHDR') throw new BadImageError('Damaged PNG')
    first = false
    const critical = type[0] >= 'A' && type[0] <= 'Z'
    if (critical || PNG_KEEP.has(type)) parts.push(buf.subarray(pos, end))
    pos = end
    if (type === 'IEND') { sawEnd = true; break }
  }
  if (!sawEnd) throw new BadImageError('Damaged PNG')
  return Buffer.concat(parts)
}

/**
 * Returns a clean copy of an uploaded image.
 * @param buf - Original file content.
 * @param ext - Type found from the content (see `detectImage`).
 * @throws BadImageError when the file cannot be read as an image.
 */
export async function cleanImage(buf: Buffer, ext: 'jpg' | 'png' | 'webp' | 'avif'): Promise<Buffer> {
  let out: Buffer
  try {
    if (ext === 'jpg') out = cleanJpeg(buf)
    else if (ext === 'png') out = cleanPng(buf)
    else {
      // sharp drops metadata by default; rotate() applies the EXIF orientation to the pixels first.
      const img = sharp(buf, { animated: ext === 'webp' }).rotate()
      out = await (ext === 'webp' ? img.webp({ quality: 92 }) : img.avif({ quality: 80, effort: 4 })).toBuffer()
    }
    // The result must decode: a file that only looks like an image is refused.
    await sharp(out, { failOn: 'error' }).metadata()
  } catch (e) {
    throw e instanceof BadImageError ? e : new BadImageError('Damaged image')
  }
  return out
}
