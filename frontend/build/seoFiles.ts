/**
 * `sitemap.xml` and `robots.txt`, written into the build output when vite-ssg finishes.
 * The site address and the indexable pages come from the CMS content of this very build.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const trimSlash = (s: string) => s.replace(/\/+$/, '')

/** Routes the server must never offer to crawlers: the app shell pages and the API. */
export const DISALLOWED = ['/cms', '/cart', '/order', '/app-shell', '/api/']

/**
 * Builds `sitemap.xml`.
 * @param site - Site origin, e.g. `https://example.com`.
 * @param paths - Page paths to list.
 * @param lastmod - Last modification date (`YYYY-MM-DD`).
 * @returns XML text.
 */
export function sitemapXml(site: string, paths: string[], lastmod: string): string {
  const urls = paths
    .map((p) => `  <url><loc>${escapeXml(p === '/' ? `${trimSlash(site)}/` : `${trimSlash(site)}${p}`)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

/**
 * Builds `robots.txt` pointing to the sitemap.
 * @param site - Site origin.
 * @returns File text.
 */
export function robotsTxt(site: string): string {
  return ['User-agent: *', 'Allow: /', ...DISALLOWED.map((p) => `Disallow: ${p}`), '', `Sitemap: ${trimSlash(site)}/sitemap.xml`, ''].join('\n')
}

/** Writes both files into `outDir`; `paths` are the indexable pages that were really built. */
export async function writeSeoFiles(outDir: string, site: string, paths: string[], now = new Date()): Promise<void> {
  await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemapXml(site, paths, now.toISOString().slice(0, 10)))
  await fs.writeFile(path.join(outDir, 'robots.txt'), robotsTxt(site))
}
