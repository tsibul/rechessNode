/**
 * Modern image formats. Every uploaded JPEG/PNG gets WebP and AVIF copies next to it
 * (`<name>.webp`, `<name>.avif`); the pages use them through `<picture>` and keep the
 * original as the fallback. `ensureVariants` is also run before every publication,
 * so a page never points at a variant that does not exist.
 * @module services/images
 */
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

export const VARIANT_FORMATS = ['webp', 'avif'] as const
const ORIGINALS = /\.(jpe?g|png|webp|avif)$/i

/** Creates the missing variants of one file; returns the formats written. Never throws on one bad file. */
export async function makeVariants(file: string): Promise<string[]> {
  const ext = path.extname(file).slice(1).toLowerCase()
  const base = file.slice(0, -(ext.length + 1))
  const written: string[] = []
  for (const format of VARIANT_FORMATS) {
    if (format === ext) continue
    const target = `${base}.${format}`
    try {
      await fs.access(target)
      continue
    } catch { /* missing: create */ }
    const tmp = `${target}.tmp`
    try {
      const image = sharp(file, { failOn: 'none' }).rotate()
      await (format === 'webp' ? image.webp({ quality: 82 }) : image.avif({ quality: 55, effort: 4 })).toFile(tmp)
      await fs.rename(tmp, target)
      written.push(format)
    } catch (e) {
      await fs.rm(tmp, { force: true })
      console.warn(`Cannot make ${format} of ${path.basename(file)}: ${(e as Error).message}`)
    }
  }
  return written
}

/** Brings every original in the directory to the full set of variants. */
export async function ensureVariants(dir: string): Promise<number> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return 0
  }
  let made = 0
  for (const name of names.filter((n) => ORIGINALS.test(n))) {
    made += (await makeVariants(path.join(dir, name))).length
  }
  return made
}

const ratios = new Map<string, number>()

/** Width / height of an uploaded file (EXIF rotation applied), `null` when it cannot be read. Cached by path. */
export async function photoRatio(dir: string, name: string): Promise<number | null> {
  const file = path.join(dir, path.basename(name))
  const hit = ratios.get(file)
  if (hit) return hit
  try {
    const m = await sharp(file, { failOn: 'none' }).metadata()
    if (!m.width || !m.height) return null
    const swap = (m.orientation ?? 1) >= 5
    const r = Math.round((swap ? m.height / m.width : m.width / m.height) * 1000) / 1000
    ratios.set(file, r)
    return r
  } catch {
    return null
  }
}

/** Adds `ratio` to photo rows so a new picture of any shape is not squeezed into a square. */
export async function withRatio<T extends { photo: string }>(dir: string, rows: T[]): Promise<Array<T & { ratio?: number }>> {
  return Promise.all(rows.map(async (r) => {
    const ratio = await photoRatio(dir, r.photo)
    return ratio ? { ...r, ratio } : r
  }))
}
