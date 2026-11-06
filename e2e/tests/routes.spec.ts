import { test, expect } from '@playwright/test'

const PAGES = ['/', '/about', '/shop', '/colors', '/privacy', '/personal-data']
const DYNAMIC = ['/cart', '/order', '/order/999999999', '/cms']

/** Console errors that are not the site's fault: the missing placeholder photos (404 of /uploads/…). */
function isNoise(text: string) {
  return /Failed to load resource.*(404|502|401)/.test(text)
}

test.describe('public routes, direct entry', () => {
  for (const path of [...PAGES, ...DYNAMIC]) {
    test(`${path} opens without errors or horizontal scroll`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => { if (m.type() === 'error' && !isNoise(m.text())) errors.push(m.text()) })
      const res = await page.goto(path)
      expect(res?.status()).toBe(200)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('body')).not.toBeEmpty()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      // /colors is a fixed-width grid of three 540 px columns: it scrolls sideways by design.
      if (path !== '/colors') expect(overflow, 'horizontal overflow, px').toBeLessThanOrEqual(0)
      expect(errors).toEqual([])
    })
  }

  for (const path of PAGES) {
    test(`${path} is a built page with title, description and h1`, async ({ page, request }) => {
      // The static HTML (before scripts) already carries the content: search engines see it.
      const html = await (await request.get(path)).text()
      expect(html).toMatch(/<title>[^<]{3,}<\/title>/)
      expect(html).toMatch(/<meta name="description" content="[^"]{10,}"/)
      expect(html).toMatch(/<link rel="canonical"/)
      await page.goto(path)
      await expect(page.locator('h1').first()).toBeVisible()
    })
  }

  test('unknown route gives 404', async ({ request }) => {
    expect((await request.get('/no-such-page')).status()).toBe(404)
  })

  test('dynamic routes are not indexed', async ({ page }) => {
    for (const path of ['/cart', '/order', '/cms']) {
      await page.goto(path)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    }
  })

  test('sitemap.xml and robots.txt', async ({ request }) => {
    const sm = await (await request.get('/sitemap.xml')).text()
    for (const p of ['/about', '/shop', '/colors']) expect(sm).toContain(p)
    expect(sm).not.toContain('/cart')
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toMatch(/Disallow: \/cms/)
    expect(robots).toMatch(/Sitemap:/)
  })
})
