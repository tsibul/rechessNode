import sanitizeHtml from 'sanitize-html'

// Editor HTML from the CMS is rendered with v-html on the public site, so it is cleaned on save.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'div', 'span', 'a', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'small',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => (attribs.target === '_blank' ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } } : { tagName, attribs })
  }
}

export function cleanHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS)
}

/** Cleans every string that contains markup, at any depth of a JSON value. */
export function cleanJson(value: unknown): unknown {
  if (typeof value === 'string') return value.includes('<') ? cleanHtml(value) : value
  if (Array.isArray(value)) return value.map(cleanJson)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, cleanJson(v)]))
  }
  return value
}
