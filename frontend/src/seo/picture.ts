/**
 * Modern-format sources for a CMS photo. The backend writes `<name>.webp` and `<name>.avif`
 * next to every uploaded original (and before every build), so the sources always exist.
 * @module seo/picture
 */
export interface PictureSource {
  type: string
  srcset: string
}

const UPLOAD = /^(\/uploads\/[0-9a-f]{32})\.(jpe?g|png|webp|avif)$/i

/** AVIF first, then WebP; the original stays the `<img>` fallback. Other images get no sources. */
export function pictureSources(src: string | null): PictureSource[] {
  const m = src ? UPLOAD.exec(src) : null
  if (!m) return []
  const own = m[2].toLowerCase()
  return (['avif', 'webp'] as const)
    .filter((f) => f !== own)
    .map((f) => ({ type: `image/${f}`, srcset: `${m[1]}.${f}` }))
}
