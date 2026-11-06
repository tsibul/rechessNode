import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { robotsTxt, sitemapXml, writeSeoFiles } from '../seoFiles'

describe('seo files', () => {
  it('sitemap lists the given pages with absolute urls', () => {
    const xml = sitemapXml('https://rechess.ru/', ['/', '/shop'], '2026-11-06')
    expect(xml).toContain('<loc>https://rechess.ru/</loc>')
    expect(xml).toContain('<loc>https://rechess.ru/shop</loc>')
    expect(xml).not.toContain('/cart')
  })

  it('robots.txt closes the service routes and names the sitemap', () => {
    const txt = robotsTxt('https://rechess.ru')
    for (const p of ['/cms', '/cart', '/order', '/api/']) expect(txt).toContain(`Disallow: ${p}`)
    expect(txt).toContain('Sitemap: https://rechess.ru/sitemap.xml')
    expect(txt).not.toContain('localhost')
  })

  it('writes both files', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'seo-'))
    await writeSeoFiles(dir, 'https://rechess.ru', ['/'])
    expect(readFileSync(path.join(dir, 'sitemap.xml'), 'utf8')).toContain('<urlset')
    expect(readFileSync(path.join(dir, 'robots.txt'), 'utf8')).toContain('User-agent: *')
  })
})
