import { test, expect } from '@playwright/test'

/** Loose budgets on a local server: they catch an accidental regression (a huge bundle, a blocking request), not tune speed. */
for (const path of ['/', '/shop', '/colors']) {
  test(`${path} loads fast and light`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' })
    await page.waitForLoadState('networkidle')
    const m = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const lcp = (performance.getEntriesByType('largest-contentful-paint').pop() as any)?.startTime ?? 0
      const bytes = performance.getEntriesByType('resource').reduce((a, e) => a + ((e as PerformanceResourceTiming).transferSize || 0), n.transferSize)
      return { bytes, ttfb: n.responseStart, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, lcp }
    })
    console.log(`${test.info().project.name} ${path}: ttfb ${m.ttfb | 0} ms, dcl ${m.dcl | 0} ms, load ${m.load | 0} ms, lcp ${m.lcp | 0} ms, ${Math.round(m.bytes / 1024)} KB`)
    expect(m.ttfb).toBeLessThan(500)
    expect(m.load).toBeLessThan(3000)
    expect(m.bytes).toBeLessThan(1_500_000)
  })
}
