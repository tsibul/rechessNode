import sharp from 'sharp'
import { cleanImage, cleanJpeg, cleanPng, BadImageError } from '../services/imageClean'

const raw = async (b: Buffer) => sharp(b).raw().toBuffer({ resolveWithObject: true })

describe('cleanImage', () => {
  it('JPEG: drops EXIF/GPS and the tail, keeps pixels and orientation', async () => {
    const src = await sharp({ create: { width: 50, height: 20, channels: 3, background: '#aa5522' } })
      .withExif({ IFD0: { Copyright: 'owner-name' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer()
    expect(src.includes('owner-name')).toBe(true) // the fixture really carries metadata
    const out = cleanJpeg(Buffer.concat([src, Buffer.from('TAIL-AFTER-EOI')]))
    expect(out.includes('owner-name')).toBe(false)
    expect(out.includes('TAIL-AFTER-EOI')).toBe(false)
    expect(out.length).toBeLessThan(src.length)
    expect((await sharp(out).metadata()).orientation).toBe(6)
    const a = await raw(src)
    const b = await raw(out)
    expect(b.data.equals(a.data)).toBe(true)
  })

  it('JPEG without orientation gets no EXIF at all', async () => {
    const src = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).withExif({ IFD0: { Copyright: 'x' } }).jpeg().toBuffer()
    expect((await sharp(cleanJpeg(src)).metadata()).exif).toBeUndefined()
  })

  it('progressive JPEG survives', async () => {
    const src = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#123456' } }).jpeg({ progressive: true }).toBuffer()
    const a = await raw(src)
    expect((await raw(cleanJpeg(src))).data.equals(a.data)).toBe(true)
  })

  it('PNG: drops text chunks and the tail, keeps pixels and transparency', async () => {
    const src = await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 0.5 } } }).png().toBuffer()
    const text = Buffer.alloc(12 + 13)
    text.writeUInt32BE(13, 0)
    text.write('tEXt', 4, 'latin1')
    text.write('Author\0secret', 8, 'latin1')
    const iend = src.length - 12
    const dirty = Buffer.concat([src.subarray(0, iend), text, src.subarray(iend), Buffer.from('TAIL')])
    const out = cleanPng(dirty)
    expect(out.includes('secret')).toBe(false)
    expect(out.includes('TAIL')).toBe(false)
    const a = await raw(src)
    const b = await raw(out)
    expect(b.info.channels).toBe(4)
    expect(b.data.equals(a.data)).toBe(true)
  })

  it('WebP and AVIF are re-encoded and still decode', async () => {
    const base = sharp({ create: { width: 16, height: 16, channels: 3, background: '#808080' } })
    const webp = await base.clone().withExif({ IFD0: { Copyright: 'zzz-owner' } }).webp().toBuffer()
    const out = await cleanImage(webp, 'webp')
    expect(out.includes('zzz-owner')).toBe(false)
    expect((await sharp(out).metadata()).format).toBe('webp')
    const avif = await base.clone().avif().toBuffer()
    expect((await sharp(await cleanImage(avif, 'avif')).metadata()).format).toBe('heif')
  })

  it('refuses damaged files', async () => {
    await expect(cleanImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4]), 'jpg')).rejects.toBeInstanceOf(BadImageError)
    await expect(cleanImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]), 'png')).rejects.toBeInstanceOf(BadImageError)
  })
})
