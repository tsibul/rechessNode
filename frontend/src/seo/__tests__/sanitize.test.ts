// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { safeHtml } from '../sanitize'

describe('safeHtml', () => {
  it('keeps text markup', () => {
    expect(safeHtml('<p>a<br><b>b</b> <a href="https://x.ru">c</a></p>')).toContain('<a href="https://x.ru">c</a>')
  })

  it('drops scripts, event handlers and javascript links', () => {
    const out = safeHtml('<p onclick="x()">a</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">b</a>')
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i)
    expect(out).toContain('<p>a</p>')
  })

  it('returns empty string for empty input', () => {
    expect(safeHtml(null)).toBe('')
  })
})
