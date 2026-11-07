/**
 * Generic CMS table editor driven by a registry. Adding a table = adding a registry entry.
 * @module routes/cms/tables
 */
import { Router } from 'express'
import { z, ZodRawShape } from 'zod'
import { db } from '../../db'
import { Permission, requireAuth, requirePermission } from '../../middleware/cmsAuth'
import { ApiError } from '../../middleware/error'
import { wrap } from '../../utils/async'
import crypto from 'crypto'
import { notDeleted } from '../../utils/db'
import { sendOrderMail } from '../../services/mail'
import { hashPassword } from '../../utils/password'
import { cleanHtml, cleanJson } from '../../utils/sanitizeHtml'

/** A table row of dynamic shape: CMS tables are described by `Spec` at run time, so columns have no static type. `any` stays on purpose (knex rows are `any` too; `unknown` would need a cast on every column). */
type Row = Record<string, any>

/** Description of an editable CMS table: permission, allowed operations and body validation. */
export interface Spec {
  table: string
  permission: Permission
  /** Extra permissions that may only read (GET) the table, e.g. SEO editors list pages. */
  readPermissions?: Permission[]
  /** Fields accepted on create. Update accepts the same fields, all optional, except `updateOmit`. */
  fields: ZodRawShape
  updateOmit?: string[]
  ops: { create?: boolean; update?: boolean; remove?: boolean }
  hidden?: string[]
  /** Fill extra response fields for a batch of rows. */
  decorate?: (rows: Row[]) => Promise<void>
  /** Transform validated data before writing. */
  prepare?: (data: Row, ctx: { creating: boolean; userId: number; id?: number }) => Promise<Row>
  /** Runs after a successful update with the row as it was before. */
  afterUpdate?: (id: number, before: Row) => Promise<void>
  /** Checks before delete. */
  beforeRemove?: (id: number, userId: number) => Promise<void>
  searchColumn?: string
}

const str = (max: number) => z.string().trim().max(max)
const req = (max: number) => str(max).min(1)
const opt = (max: number) => str(max).nullish().transform((v) => (v === '' ? null : v))
const priority = z.number().int().min(-32768).max(32767)
const fk = z.number().int().positive()

/**
 * Payment states an order can have.
 */
export const PAYMENT_STATES = ['not_paid', 'pending', 'paid', 'failed', 'refunded'] as const
/**
 * Photo slots of a product (side view, top view, board).
 */
export const PHOTO_SLOTS = ['side', 'top', 'board'] as const
const photoName = req(255).regex(/^(?!\.+$)[A-Za-z0-9._-]+$/, 'Invalid file name')

/** Editable tables by name; `fields` is the validation schema of the request body. */
export const REGISTRY: Record<string, Spec> = {
  color: {
    table: 'color', permission: 'references', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { name: req(255), code: z.string().length(2), hex: z.string().regex(/^[0-9a-fA-F]{6}$/).nullish() }
  },
  product: {
    table: 'product', permission: 'references', readPermissions: ['prices'], ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: {
      name: req(255), description: z.string().max(65000).nullish(),
      weight_g: z.number().int().min(0).max(1000000).nullish(), length_mm: z.number().int().min(0).max(100000).nullish(),
      width_mm: z.number().int().min(0).max(100000).nullish(), height_mm: z.number().int().min(0).max(100000).nullish()
    }
  },
  delivery_tariff: {
    table: 'delivery_tariff', permission: 'prices', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: {
      name: req(255), address_delivery: z.boolean(), city: opt(255),
      weight_to: z.number().int().min(0).max(10000000).nullish(), price: z.number().int().min(0).max(10000000), priority
    }
  },
  item: {
    table: 'item', permission: 'references', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { name: req(255), product_id: fk, main_color: fk, second_color: fk }
  },
  item_photo: {
    table: 'item_photo', permission: 'references', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { name: req(255), priority, photo: photoName, slot: z.enum(PHOTO_SLOTS).default('side'), item_id: fk }
  },
  index_photo: {
    table: 'index_photo', permission: 'references', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { name: req(255), priority, photo: photoName }
  },
  shops: {
    table: 'shops', permission: 'references', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { name: req(255), address: req(500), working_hours: opt(255), phone: opt(20), web_site: opt(255) }
  },
  shop_photo: {
    table: 'shop_photo', permission: 'references', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { name: req(255), priority, photo: photoName, shop_id: fk }
  },
  seller: {
    table: 'seller', permission: 'references', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: {
      name: req(255), ogrn: req(13), inn: req(12), kpp: req(9), address: req(500), phone: req(20)
    }
  },
  order_state: {
    table: 'order_state', permission: 'references', readPermissions: ['orders'], ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { name: req(255), priority }
  },
  price: {
    table: 'price', permission: 'prices', ops: { create: true, update: true, remove: true },
    fields: { product_id: fk, price: z.number().int().min(0), price_date: z.coerce.date() }
  },
  seo: {
    table: 'seo', permission: 'seo', ops: { create: true, update: true, remove: true }, searchColumn: 'title',
    fields: {
      page_id: fk, title: req(255), description: req(500), og_title: opt(255), og_description: opt(500),
      og_image: opt(255), robots_index: z.boolean()
    }
  },
  page: {
    table: 'page', permission: 'pages', readPermissions: ['seo'], ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9-]+$/), name: req(255) }
  },
  page_block: {
    table: 'page_block', permission: 'pages', ops: { create: true, update: true, remove: true },
    fields: {
      page_id: fk, code: req(100), priority,
      content: z.unknown().refine((v) => v !== undefined, 'Required')
    },
    /** Normalises the validated body before it is written. */
    prepare: async (data) => {
      if ('content' in data) data.content = JSON.stringify(cleanJson(data.content))
      return data
    },
    /** Adds computed fields to the rows sent to the client. */
    decorate: async (rows) => {
      for (const r of rows) {
        if (typeof r.content === 'string') {
          try { r.content = JSON.parse(r.content) } catch { r.content = null }
        }
      }
    }
  },
  setting: {
    table: 'setting', permission: 'settings', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: {
      code: z.string().trim().min(1).max(100).regex(/^[a-z0-9_.-]+$/),
      name: req(255), type: z.enum(['text', 'html', 'number', 'boolean', 'photo']),
      value: z.string().max(65000).nullish(), group_name: opt(100), priority
    },
    updateOmit: ['code'],
    /** Normalises the validated body before it is written. */
    prepare: async (data, ctx) => {
      if (typeof data.value === 'string') {
        const type = 'type' in data ? data.type : ctx.id ? (await db('setting').where({ id: ctx.id }).first('type'))?.type : undefined
        if (type === 'html') data.value = cleanHtml(data.value)
      }
      return data
    }
  },
  user: {
    table: 'user', permission: 'users', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    hidden: ['password', 'hashToken'],
    fields: { name: req(255), login: req(255), password: z.string().min(8).max(200), role_id: fk },
    /** Normalises the validated body before it is written. */
    prepare: async (data, ctx) => {
      if (!ctx.creating && ctx.id === ctx.userId && 'role_id' in data) {
        throw new ApiError(400, 'Cannot change own role')
      }
      if ('password' in data) {
        data.password = await hashPassword(data.password)
        // A new password ends every session of the user (the token stamp changes).
        if (!ctx.creating) data.hashToken = crypto.randomBytes(24).toString('hex')
      }
      return data
    },
    /** Checks that the row may be marked as deleted. */
    beforeRemove: async (id, userId) => {
      if (id === userId) throw new ApiError(400, 'Cannot delete yourself')
    }
  },
  role: {
    table: 'role', permission: 'users', ops: { create: true, update: true, remove: true }, searchColumn: 'name',
    fields: { code: z.string().trim().min(1).max(50).regex(/^[a-z0-9_-]+$/), name: req(255) },
    /** Checks that the row may be marked as deleted. */
    beforeRemove: async (id) => {
      const used = await notDeleted(db('user').where({ role_id: id })).first('id')
      if (used) throw new ApiError(409, 'Role is in use')
    }
  },
  client: {
    table: 'client', permission: 'clients', ops: { update: true, remove: true }, searchColumn: 'name',
    hidden: ['tokenHash', 'ip_address'],
    fields: {
      name: req(255), family_name: opt(255), city: opt(255), phone: opt(20), e_mail: opt(255),
      address_delivery: z.boolean(), delivery_address: opt(500), delivery_point_code: opt(50)
    },
    // Customer card: order history and carts of the client (the manager sees what and when was ordered).
    /** Adds computed fields to the rows sent to the client. */
    decorate: async (rows) => {
      if (!rows.length) return
      const ids = rows.map((r) => r.id)
      const orders = await notDeleted(db('order').whereIn('client_id', ids))
        .select('id', 'client_id', 'number', 'date', 'sum', 'order_state_id', 'payment_state').orderBy('date', 'desc').orderBy('id', 'desc')
      const states = await db('order_state').select('id', 'name')
      const carts = await notDeleted(db('cart').whereIn('client_id', ids)).select('client_id', 'ordered')
      for (const r of rows) {
        const mine = orders.filter((o) => o.client_id === r.id)
        r.orders = mine.map((o) => ({
          id: o.id, number: o.number, date: o.date, sum: o.sum, payment_state: o.payment_state,
          state: states.find((s) => s.id === o.order_state_id)?.name ?? null
        }))
        r.orders_sum = mine.reduce((a, o) => a + o.sum, 0)
        r.open_carts = carts.filter((c) => c.client_id === r.id && !c.ordered).length
      }
    }
  },
  cart: {
    table: 'cart', permission: 'carts', ops: { remove: true }, fields: {},
    /** Adds computed fields to the rows sent to the client. */
    decorate: async (rows) => {
      if (!rows.length) return
      const clients = await db('client').whereIn('id', rows.map((r) => r.client_id)).select('id', 'name', 'phone', 'e_mail')
      const items = await db('cart_item as ci').join('item as i', 'i.id', 'ci.item_id')
        .whereIn('ci.cart_id', rows.map((r) => r.id))
        .select('ci.cart_id', 'ci.item_id', 'i.name', 'ci.quantity')
      for (const r of rows) {
        const c = clients.find((x) => x.id === r.client_id)
        r.client = c ? { name: c.name, phone: c.phone ?? null, e_mail: c.e_mail ?? null } : null
        r.items = items.filter((i) => i.cart_id === r.id).map((i) => ({ item_id: i.item_id, name: i.name, quantity: i.quantity }))
      }
    }
  },
  order: {
    table: 'order', permission: 'orders', ops: { update: true }, searchColumn: 'name',
    fields: {
      order_state_id: fk, delivery_reference: opt(255),
      payment_state: z.enum(PAYMENT_STATES), comment: opt(1000)
    },
    /** Normalises the validated body before it is written. */
    prepare: async (data, ctx) => ({
      ...data,
      ...('delivery_reference' in data ? { delivery_reference: data.delivery_reference ? String(data.delivery_reference).trim() || null : null } : {}),
      updated_by: ctx.userId, last_updated: db.fn.now()
    }),
    // A new tracking number goes to the buyer once; a failed mail is stored in the order, the update stands.
    /** Runs after a successful update. */
    afterUpdate: async (id) => {
      const o = await db('order').where({ id }).first('delivery_reference', 'track_sent_ref')
      if (o?.delivery_reference && o.delivery_reference !== o.track_sent_ref) await sendOrderMail(id, 'track')
    },
    /** Adds computed fields to the rows sent to the client. */
    decorate: async (rows) => {
      if (!rows.length) return
      const states = await db('order_state').select('id', 'name')
      const items = await db('order_item as oi').join('item as i', 'i.id', 'oi.item_id')
        .join('color as m', 'm.id', 'i.main_color').join('color as s', 's.id', 'i.second_color')
        .whereIn('oi.order_id', rows.map((r) => r.id))
        .select('oi.order_id', 'oi.item_id', 'i.name', 'm.code as m_code', 's.code as s_code', 'oi.quantity', 'oi.price')
      for (const r of rows) {
        r.state = states.find((s) => s.id === r.order_state_id)?.name ?? null
        r.items = items.filter((i) => i.order_id === r.id).map((i) => ({
          item_id: i.item_id, name: i.name, article: `${i.m_code}${i.s_code}`, quantity: i.quantity, price: i.price
        }))
      }
    }
  }
}

/**
 * CMS routes for editing the reference tables; access depends on the permission of each table.
 */
export const cmsTablesRouter = Router()
cmsTablesRouter.use(requireAuth)

const RESERVED = new Set(['page', 'limit', 'deleted', 'sort', 'dir', 'q', 'abandoned', 'hours', 'ordered'])
const columnCache = new Map<string, string[]>()

async function columnsOf(spec: Spec): Promise<string[]> {
  let cols = columnCache.get(spec.table)
  if (!cols) {
    cols = Object.keys(await db(spec.table).columnInfo())
    columnCache.set(spec.table, cols)
  }
  return cols.filter((c) => !spec.hidden?.includes(c))
}

const hasDeleted = (cols: string[]) => cols.includes('deleted')

function specOf(name: string): Spec {
  const spec = Object.prototype.hasOwnProperty.call(REGISTRY, name) ? REGISTRY[name] : undefined
  if (!spec) throw new ApiError(404, 'Unknown table')
  return spec
}

function idOf(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) throw new ApiError(404, 'Not found')
  return id
}

function single(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

// Per-request guard: unknown table -> 404, then permission check of that table.
cmsTablesRouter.use('/:name', (req, res, next) => {
  try {
    const spec = specOf(req.params.name)
    const reading = req.method === 'GET' || req.method === 'HEAD'
    requirePermission(spec.permission, ...(reading ? spec.readPermissions ?? [] : []))(req, res, next)
  } catch (e) { next(e) }
})

async function readRows(spec: Spec, ids: number[]): Promise<Row[]> {
  const cols = await columnsOf(spec)
  const rows = await db(spec.table).whereIn('id', ids).select(cols)
  if (spec.decorate) await spec.decorate(rows)
  return rows
}

cmsTablesRouter.get('/:name', wrap(async (req, res) => {
  const spec = specOf(req.params.name)
  const cols = await columnsOf(spec)
  const q = req.query
  const page = Math.max(1, Number(single(q.page)) || 1)
  const limit = Math.min(200, Math.max(1, Number(single(q.limit)) || 50))
  const sort = single(q.sort) ?? 'id'
  if (!cols.includes(sort)) throw new ApiError(400, 'Invalid sort column')
  const dir = single(q.dir) === 'desc' ? 'desc' : 'asc'

  const build = () => {
    const b = db(spec.table)
    if (hasDeleted(cols)) {
      const d = single(q.deleted) ?? '0'
      if (d === '0') notDeleted(b)
      else if (d === '1') b.where('deleted', 1)
      else if (d !== 'all') throw new ApiError(400, 'Invalid deleted filter')
    }
    for (const [key, value] of Object.entries(q)) {
      if (RESERVED.has(key)) continue
      if (!cols.includes(key) || typeof value !== 'string') throw new ApiError(400, `Invalid filter: ${key}`)
      b.where(key, value)
    }
    const text = single(q.q)
    if (text && spec.searchColumn) b.where(spec.searchColumn, 'like', `%${text.replace(/[%_\\]/g, '\\$&')}%`)
    if (spec.table === 'cart') {
      if (single(q.ordered) === '0' || single(q.abandoned) === '1') b.whereNull('ordered')
      if (single(q.abandoned) === '1') {
        const hours = Math.max(1, Number(single(q.hours)) || 24)
        b.where('last_updated', '<', db.raw('DATE_SUB(NOW(), INTERVAL ? HOUR)', [hours]))
          .whereExists(db('cart_item').whereRaw('cart_item.cart_id = cart.id'))
      }
    }
    return b
  }

  const totalRow = await build().count({ c: '*' }).first()
  const rows = await build().select(cols).orderBy(sort, dir).orderBy('id', 'asc')
    .limit(limit).offset((page - 1) * limit)
  if (spec.decorate) await spec.decorate(rows)
  res.json({ rows, total: Number(totalRow?.c ?? 0), page, limit })
}))

/** Orders per status for the filter chips (the same orders the list shows). Right `orders`. */
cmsTablesRouter.get('/order/state-counts', wrap(async (_req, res) => {
  const rows = await db('order').groupBy('order_state_id').select('order_state_id').count({ c: '*' }) as unknown as { order_state_id: number; c: string | number }[]
  const states = await db('order_state').orderBy('priority').orderBy('id').select('id', 'name', 'deleted')
  const counts = new Map(rows.map((r) => [Number(r.order_state_id), Number(r.c)] as const))
  res.json({
    total: [...counts.values()].reduce((a, b) => a + b, 0),
    states: states.filter((s) => !s.deleted || counts.get(s.id)).map((s) => ({ id: s.id, name: s.name, count: counts.get(s.id) ?? 0 }))
  })
}))

cmsTablesRouter.get('/:name/:id', wrap(async (req, res) => {
  const spec = specOf(req.params.name)
  const [row] = await readRows(spec, [idOf(req.params.id)])
  if (!row) throw new ApiError(404, 'Not found')
  res.json({ row })
}))

function requireOp(spec: Spec, op: 'create' | 'update' | 'remove') {
  if (!spec.ops[op]) throw new ApiError(405, 'Operation not allowed')
}

cmsTablesRouter.post('/:name', wrap(async (req, res) => {
  const spec = specOf(req.params.name)
  requireOp(spec, 'create')
  let data: Row = z.object(spec.fields).strict().parse(req.body)
  if (spec.prepare) data = await spec.prepare(data, { creating: true, userId: req.cmsUser!.id })
  const [id] = await db(spec.table).insert({ ...data, deleted: false })
  const [row] = await readRows(spec, [id])
  res.status(201).json({ row })
}))

cmsTablesRouter.patch('/:name/:id', wrap(async (req, res) => {
  const spec = specOf(req.params.name)
  requireOp(spec, 'update')
  const id = idOf(req.params.id)
  const shape = { ...spec.fields }
  for (const k of spec.updateOmit ?? []) delete shape[k]
  // zod 4 applies defaults inside partial(); an update must not reset omitted fields, so unwrap them.
  for (const k of Object.keys(shape)) {
    const f = shape[k]
    if (f instanceof z.ZodDefault) shape[k] = f.unwrap() as typeof f
  }
  let data: Row = z.object(shape).partial().strict().parse(req.body)
  if (!Object.keys(data).length) throw new ApiError(400, 'Nothing to update')
  if (!(await db(spec.table).where({ id }).first('id'))) throw new ApiError(404, 'Not found')
  if (spec.prepare) data = await spec.prepare(data, { creating: false, userId: req.cmsUser!.id, id })
  const before = await db(spec.table).where({ id }).first()
  await db(spec.table).where({ id }).update(data)
  if (spec.afterUpdate) await spec.afterUpdate(id, before)
  const [row] = await readRows(spec, [id])
  res.json({ row })
}))

cmsTablesRouter.delete('/:name/:id', wrap(async (req, res) => {
  const spec = specOf(req.params.name)
  requireOp(spec, 'remove')
  const id = idOf(req.params.id)
  if (!(await db(spec.table).where({ id }).first('id'))) throw new ApiError(404, 'Not found')
  if (spec.beforeRemove) await spec.beforeRemove(id, req.cmsUser!.id)
  await db(spec.table).where({ id }).update({ deleted: true })
  res.status(204).end()
}))

cmsTablesRouter.post('/:name/:id/restore', wrap(async (req, res) => {
  const spec = specOf(req.params.name)
  requireOp(spec, 'remove')
  const id = idOf(req.params.id)
  if (!(await db(spec.table).where({ id }).first('id'))) throw new ApiError(404, 'Not found')
  await db(spec.table).where({ id }).update({ deleted: false })
  const [row] = await readRows(spec, [id])
  res.json({ row })
}))

/** Sends a mail of the order again (after a failure or on request). Right `orders`. */
/** Body of `POST /order/:id/send-mail`. */
export const sendMailSchema = z.object({ kind: z.enum(['confirmation', 'track', 'manager']) }).strict()

cmsTablesRouter.post('/order/:id/send-mail', wrap(async (req, res) => {
  const id = idOf(req.params.id)
  const { kind } = sendMailSchema.parse(req.body)
  const order = await db('order').where({ id }).first('id', 'delivery_reference')
  if (!order) throw new ApiError(404, 'Not found')
  if (kind === 'track' && !order.delivery_reference) throw new ApiError(400, 'Order has no tracking number')
  const ok = await sendOrderMail(id, kind)
  const [row] = await readRows(specOf('order'), [id])
  res.json({ ok, row })
}))
