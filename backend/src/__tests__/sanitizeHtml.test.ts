import { cleanHtml, cleanJson } from '../utils/sanitizeHtml'

describe('cleanHtml', () => {
  it('keeps ordinary text markup', () => {
    const html = '<p>Hello<br>world <b>bold</b> <a href="https://rechess.ru/x" target="_blank">link</a></p>'
    expect(cleanHtml(html)).toBe('<p>Hello<br />world <b>bold</b> <a href="https://rechess.ru/x" target="_blank" rel="noopener noreferrer">link</a></p>')
  })

  it('removes scripts, handlers and dangerous schemes', () => {
    const out = cleanHtml('<p onclick="x()">a</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">b</a><iframe src="//e"></iframe>')
    expect(out).not.toMatch(/script|onclick|onerror|javascript:|iframe/i)
    expect(out).toContain('<p>a</p>')
  })

  it('cleans nested strings in JSON, leaves plain values', () => {
    const out = cleanJson({ title: 'A & B', columns: ['<p>ok</p><script>x</script>'], n: 3 }) as { title: string; columns: string[]; n: number }
    expect(out.title).toBe('A & B')
    expect(out.columns[0]).toBe('<p>ok</p>')
    expect(out.n).toBe(3)
  })
})
