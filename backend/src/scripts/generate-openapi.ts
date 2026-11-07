/**
 * Generates `docs/openapi.json` and the static page `docs/api.html` from the zod schemas that validate
 * the request bodies, so the documented bodies cannot drift from the code.
 * Usage: npm run docs:openapi
 * @module scripts/generate-openapi
 */
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'
import { db } from '../db'
import { loginSchema } from '../routes/cms/auth'
import { permissionsSchema } from '../routes/cms/roles'
import { REGISTRY, sendMailSchema } from '../routes/cms/tables'
import { addItemSchema, orderSchema, quantitySchema } from '../routes/shop'
import { stubNotificationSchema } from '../services/payment/stub'

type Json = Record<string, unknown>
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/** Short description of one endpoint. */
interface Endpoint {
  method: Method
  path: string
  tag: string
  summary: string
  /** Body schema name from `components.schemas`. */
  body?: string
  /** Path parameters. */
  params?: Array<{ name: string; description: string; schema?: Json }>
  /** Query parameters. */
  query?: Array<{ name: string; description: string }>
  /** `cms` = CMS session cookie; `client` = visitor cookie (optional). */
  auth?: 'cms' | 'client'
  /** Permission codes, any of which grants access. */
  permissions?: string[]
  /** Description of the 200 response. */
  response: string
  status?: number
}

const id = (name: string, description: string) => ({ name, description, schema: { type: 'integer', minimum: 1 } })

const schemaOf = (s: z.ZodType): Json => {
  const j = z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' }) as Json
  delete j.$schema
  return j
}

/** Request body schemas, generated from the zod schemas used by the routes. */
function bodySchemas(): Record<string, Json> {
  const out: Record<string, Json> = {
    LoginBody: schemaOf(loginSchema),
    PermissionsBody: schemaOf(permissionsSchema),
    AddCartItemBody: schemaOf(addItemSchema),
    CartQuantityBody: schemaOf(quantitySchema),
    OrderBody: schemaOf(orderSchema),
    StubNotificationBody: schemaOf(stubNotificationSchema),
    SendMailBody: schemaOf(sendMailSchema)
  }
  for (const [name, spec] of Object.entries(REGISTRY)) {
    out[`Cms_${name}`] = schemaOf(z.object(spec.fields).strict())
  }
  return out
}

const PUBLIC: Endpoint[] = [
  { method: 'get', path: '/health', tag: 'Public', summary: 'Liveness check', response: 'Service status' },
  { method: 'get', path: '/products', tag: 'Public', summary: 'Products with colours, prices and photos', response: '`{ products }`' },
  { method: 'get', path: '/products/{id}/price', tag: 'Public', summary: 'Current price of a product', params: [id('id', 'Product id')], response: '`{ product_id, price }`; 404 when unknown' },
  { method: 'get', path: '/pages', tag: 'Public', summary: 'Published pages with blocks', response: '`{ pages }`' },
  { method: 'get', path: '/pages/{slug}', tag: 'Public', summary: 'One published page', params: [{ name: 'slug', description: 'Page slug' }], response: 'The page; 404 when unknown' },
  { method: 'get', path: '/settings', tag: 'Public', summary: 'Public site settings', response: 'Settings by code' },
  { method: 'get', path: '/shops', tag: 'Public', summary: 'Shops', response: '`{ shops }`' },
  { method: 'get', path: '/index-photos', tag: 'Public', summary: 'Photos of the home page', response: '`{ photos }`' },
  { method: 'get', path: '/seller', tag: 'Public', summary: 'Seller details', response: '`{ seller }`' },
  { method: 'get', path: '/site', tag: 'Public', summary: 'Everything the site build needs in one response', response: 'Site content' }
]

const SHOP: Endpoint[] = [
  { method: 'get', path: '/cart', tag: 'Shop', summary: 'Cart of the visitor', auth: 'client', response: 'Cart view: `items`, `count`, `total`' },
  { method: 'post', path: '/cart/items', tag: 'Shop', summary: 'Add a product to the cart', auth: 'client', body: 'AddCartItemBody', response: 'Updated cart view; sets the visitor cookie on first use' },
  { method: 'patch', path: '/cart/items/{itemId}', tag: 'Shop', summary: 'Change the quantity of a cart line (0 removes it)', auth: 'client', params: [id('itemId', 'Product id')], body: 'CartQuantityBody', response: 'Updated cart view' },
  { method: 'delete', path: '/cart/items/{itemId}', tag: 'Shop', summary: 'Remove a cart line', auth: 'client', params: [id('itemId', 'Product id')], response: 'Updated cart view' },
  { method: 'get', path: '/checkout/prefill', tag: 'Shop', summary: 'Checkout data from the previous order', auth: 'client', response: '`{ contact }` (null when unknown)' },
  { method: 'get', path: '/checkout/delivery', tag: 'Shop', summary: 'Delivery options for the cart and a city', auth: 'client', query: [{ name: 'city', description: 'City name' }], response: 'Weight, door and pickup costs' },
  { method: 'post', path: '/orders', tag: 'Shop', summary: 'Place an order from the cart', auth: 'client', body: 'OrderBody', status: 201, response: '`{ order }` with its payment' },
  { method: 'get', path: '/orders/{number}', tag: 'Shop', summary: 'An order of this visitor', auth: 'client', params: [id('number', 'Order number')], response: '`{ order }`; 404 for someone else’s order' },
  { method: 'get', path: '/orders/{number}/payment', tag: 'Shop', summary: 'Payment state of an order', auth: 'client', params: [id('number', 'Order number')], response: '`{ payment }`' },
  { method: 'post', path: '/orders/{number}/payment', tag: 'Shop', summary: 'Retry the payment of an order', auth: 'client', params: [id('number', 'Order number')], response: '`{ payment }`' },
  { method: 'post', path: '/payments/{provider}/notify', tag: 'Shop', summary: 'Payment notification from a provider (the stub page sends it too)', params: [{ name: 'provider', description: 'Provider code, e.g. `stub`' }], body: 'StubNotificationBody', response: '`{ state, changed }`; repeats are harmless' }
]

const CMS: Endpoint[] = [
  { method: 'post', path: '/cms/login', tag: 'CMS auth', summary: 'Sign in; sets the session cookie', body: 'LoginBody', response: '`{ user }`' },
  { method: 'post', path: '/cms/logout', tag: 'CMS auth', summary: 'Sign out', auth: 'cms', response: 'Empty confirmation' },
  { method: 'get', path: '/cms/me', tag: 'CMS auth', summary: 'Current user with permissions', auth: 'cms', response: '`{ user }`' },
  { method: 'get', path: '/cms/roles', tag: 'CMS roles', summary: 'Roles with permissions', auth: 'cms', permissions: ['users'], response: '`{ roles }`' },
  { method: 'put', path: '/cms/roles/{id}/permissions', tag: 'CMS roles', summary: 'Replace the permissions of a role', auth: 'cms', permissions: ['users'], params: [id('id', 'Role id')], body: 'PermissionsBody', response: '`{ role }`' },
  { method: 'post', path: '/cms/uploads', tag: 'CMS uploads', summary: 'Upload an image (multipart field `file`, up to 10 MB; jpg, png, webp, avif)', auth: 'cms', permissions: ['references', 'pages', 'seo', 'settings'], response: '`{ photo }` – stored file name' },
  { method: 'post', path: '/cms/publish', tag: 'CMS publish', summary: 'Start a site build', auth: 'cms', permissions: ['publish'], status: 202, response: '`{ publication }`; 409 when a build is running' },
  { method: 'get', path: '/cms/publications', tag: 'CMS publish', summary: 'Latest builds', auth: 'cms', permissions: ['publish'], query: [{ name: 'limit', description: 'Maximum number of records' }], response: '`{ publications }`' },
  { method: 'get', path: '/cms/publications/{id}', tag: 'CMS publish', summary: 'One build', auth: 'cms', permissions: ['publish'], params: [id('id', 'Publication id')], response: '`{ publication }`' }
]

const TABLE = { name: 'name', description: `Table name: ${Object.keys(REGISTRY).join(', ')}`, schema: { type: 'string', enum: Object.keys(REGISTRY) } }
const ROW = id('id', 'Row id')
const CMS_TABLES: Endpoint[] = [
  { method: 'get', path: '/cms/tables/{name}', tag: 'CMS tables', summary: 'List rows (search, sort, page)', auth: 'cms', params: [TABLE], query: [{ name: 'q', description: 'Search text' }, { name: 'page', description: 'Page number' }, { name: 'sort', description: 'Sort column' }], response: 'Rows and the total count' },
  { method: 'get', path: '/cms/tables/order/state-counts', tag: 'CMS tables', summary: 'Number of orders per state', auth: 'cms', permissions: ['orders'], response: '`{ total, states }`' },
  { method: 'get', path: '/cms/tables/{name}/{id}', tag: 'CMS tables', summary: 'One row', auth: 'cms', params: [TABLE, ROW], response: '`{ row }`' },
  { method: 'post', path: '/cms/tables/{name}', tag: 'CMS tables', summary: 'Create a row; the body is validated by the schema `Cms_<name>`', auth: 'cms', params: [TABLE], body: 'Cms_*', status: 201, response: '`{ row }`' },
  { method: 'patch', path: '/cms/tables/{name}/{id}', tag: 'CMS tables', summary: 'Update a row; same fields as create, all optional', auth: 'cms', params: [TABLE, ROW], body: 'Cms_*', response: '`{ row }`' },
  { method: 'delete', path: '/cms/tables/{name}/{id}', tag: 'CMS tables', summary: 'Mark a row as deleted', auth: 'cms', params: [TABLE, ROW], response: 'Empty confirmation' },
  { method: 'post', path: '/cms/tables/{name}/{id}/restore', tag: 'CMS tables', summary: 'Restore a deleted row', auth: 'cms', params: [TABLE, ROW], response: '`{ row }`' },
  { method: 'post', path: '/cms/tables/order/{id}/send-mail', tag: 'CMS tables', summary: 'Send an order e-mail', auth: 'cms', permissions: ['orders'], params: [ROW], body: 'SendMailBody', response: '`{ row }`' }
]

const ENDPOINTS = [...PUBLIC, ...SHOP, ...CMS, ...CMS_TABLES]

/** Builds the OpenAPI 3.1 document. */
function buildDocument(): Json {
  const schemas = bodySchemas()
  const tableRefs = Object.keys(REGISTRY).map((n) => ({ $ref: `#/components/schemas/Cms_${n}` }))
  const paths: Record<string, Record<string, Json>> = {}
  for (const e of ENDPOINTS) {
    const parameters = [
      ...(e.params ?? []).map((p) => ({ name: p.name, in: 'path', required: true, description: p.description, schema: p.schema ?? { type: 'string' } })),
      ...(e.query ?? []).map((q) => ({ name: q.name, in: 'query', required: false, description: q.description, schema: { type: 'string' } }))
    ]
    const bodySchema = e.body === 'Cms_*' ? { oneOf: tableRefs } : e.body ? { $ref: `#/components/schemas/${e.body}` } : undefined
    const op: Json = {
      tags: [e.tag],
      summary: e.summary,
      ...(e.permissions ? { description: `Requires one of the permissions: ${e.permissions.join(', ')}.` } : {}),
      ...(parameters.length ? { parameters } : {}),
      ...(bodySchema ? { requestBody: { required: true, content: { 'application/json': { schema: bodySchema } } } } : {}),
      ...(e.auth === 'cms' ? { security: [{ cmsSession: [] }] } : e.auth === 'client' ? { security: [{}, { visitorCookie: [] }] } : {}),
      responses: {
        [String(e.status ?? 200)]: { description: e.response },
        '400': { description: 'Validation error: `{ error, details }`' },
        ...(e.auth === 'cms' ? { '401': { description: 'No valid session' }, '403': { description: 'Missing permission' } } : {})
      }
    }
    ;(paths[e.path] ??= {})[e.method] = op
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'reChess API',
      version: '1.0.0',
      description: 'JSON API of the reChess shop. Request bodies are generated from the zod schemas of the routes; response shapes are described in words.'
    },
    servers: [{ url: '/api' }],
    tags: ['Public', 'Shop', 'CMS auth', 'CMS roles', 'CMS uploads', 'CMS publish', 'CMS tables'].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        cmsSession: { type: 'apiKey', in: 'cookie', name: 'rc_cms', description: 'CMS session cookie set by `POST /cms/login`' },
        visitorCookie: { type: 'apiKey', in: 'cookie', name: 'rc_client', description: 'Anonymous visitor cookie set when the first cart line is added' }
      },
      schemas
    }
  }
}

const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const md = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>')

/** Renders a self-contained HTML page (no scripts, no external files). */
function renderHtml(doc: Json): string {
  const paths = doc.paths as Record<string, Record<string, Json>>
  const schemas = (doc.components as { schemas: Record<string, Json> }).schemas
  const byTag = new Map<string, string[]>()
  for (const [p, ops] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const o = op as Json & { tags: string[]; summary: string; description?: string; parameters?: Array<{ name: string; in: string; description: string }>; requestBody?: { content: { 'application/json': { schema: Json } } }; responses: Record<string, { description: string }>; security?: Json[] }
      const ref = (o.requestBody?.content['application/json'].schema.$ref as string | undefined)?.split('/').pop()
      const parts = [
        `<section class="op"><h3><span class="m ${method}">${method.toUpperCase()}</span> <code>${esc(p)}</code></h3>`,
        `<p>${md(o.summary)}</p>`,
        o.description ? `<p>${md(o.description)}</p>` : '',
        o.security ? `<p class="auth">Auth: ${o.security.some((s) => 'cmsSession' in s) ? 'CMS session cookie' : 'visitor cookie (optional)'}</p>` : '',
        o.parameters?.length ? `<ul>${o.parameters.map((q) => `<li><code>${esc(q.name)}</code> (${q.in}) – ${md(q.description)}</li>`).join('')}</ul>` : '',
        ref ? `<p>Body: <a href="#${esc(ref)}">${esc(ref)}</a></p>` : o.requestBody ? '<p>Body: one of the <code>Cms_*</code> schemas below, chosen by the table name</p>' : '',
        `<ul class="resp">${Object.entries(o.responses).map(([c, r]) => `<li><b>${c}</b> – ${md(r.description)}</li>`).join('')}</ul></section>`
      ]
      byTag.set(o.tags[0], [...(byTag.get(o.tags[0]) ?? []), parts.join('')])
    }
  }
  const info = doc.info as { title: string; description: string }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(info.title)}</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;max-width:60rem;margin:0 auto;padding:1rem;color:#1d1d1f;background:#fff}
@media(prefers-color-scheme:dark){body{color:#e8e8ea;background:#16161a}pre,code{background:#26262c}}
code,pre{background:#f0f0f3;border-radius:4px;padding:0 .25em}pre{padding:.6em;overflow:auto}
.op{border-top:1px solid #8884;padding:.4rem 0}.m{display:inline-block;min-width:4.5em;text-align:center;border-radius:4px;color:#fff;font-size:.8em;padding:.1em .4em}
.get{background:#2a7}.post{background:#27c}.put{background:#c82}.patch{background:#a5b}.delete{background:#c33}.auth{font-size:.9em;opacity:.8}
.resp{list-style:none;padding:0}
</style></head><body>
<h1>${esc(info.title)}</h1><p>${md(info.description)} Base path: <code>/api</code>. Machine-readable: <a href="openapi.json">openapi.json</a>.</p>
${[...byTag.entries()].map(([t, ops]) => `<h2>${esc(t)}</h2>${ops.join('')}`).join('\n')}
<h2>Request body schemas</h2>
${Object.entries(schemas).map(([n, s]) => `<h3 id="${esc(n)}">${esc(n)}</h3><pre>${esc(JSON.stringify(s, null, 2))}</pre>`).join('\n')}
</body></html>
`
}

async function main(): Promise<void> {
  const doc = buildDocument()
  const dir = path.resolve(__dirname, '../../../docs')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'openapi.json'), JSON.stringify(doc, null, 2) + '\n')
  writeFileSync(path.join(dir, 'api.html'), renderHtml(doc))
  console.log(`OpenAPI written: ${Object.keys(doc.paths as object).length} paths, ${ENDPOINTS.length} operations`)
  await db.destroy()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
