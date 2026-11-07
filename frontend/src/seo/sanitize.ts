import DOMPurify from 'dompurify'

// CMS HTML is also cleaned by the server on save. In the browser it is cleaned again before v-html;
// during prerender there is no DOM, and the text comes from the already cleaned server data.
const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'div', 'span', 'a', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'small',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'src', 'alt', 'width', 'height', 'class'],
  ALLOW_DATA_ATTR: false
}

export function safeHtml(html: string | null | undefined): string {
  if (!html) return ''
  if (typeof window === 'undefined') return html
  return DOMPurify.sanitize(html, CONFIG)
}
