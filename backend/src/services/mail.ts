/**
 * Order mails: confirmation and tracking number. SMTP settings come from `.env`;
 * without SMTP_HOST the mail is written to a file (MAIL_OUTBOX_DIR) and nothing is sent.
 * A mail failure is stored in the order and never fails the caller.
 * @module services/mail
 */
import * as fs from 'fs'
import * as path from 'path'
import nodemailer, { Transporter } from 'nodemailer'
import sharp from 'sharp'
import { db } from '../db'
import { shortProductName } from '../utils/productName'
import { uploadDir } from '../routes/cms/uploads'

/**
 * Kind of an e-mail the shop sends.
 */
export type MailKind = 'confirmation' | 'track' | 'manager'

/** Picture embedded in the mail (`<img src="cid:…">`): shown without any public site. */
export interface MailImage { cid: string; filename: string; content: Buffer }

/**
 * An e-mail ready to be sent or saved to the outbox.
 */
export interface MailMessage { to: string; subject: string; html: string; text: string; from: string; attachments?: MailImage[] }

/** Function that delivers a prepared e-mail (replaceable in tests). */
export type Sender = (message: MailMessage) => Promise<void>

let senderOverride: Sender | null = null
/** For tests: replaces the transport. Pass null to restore. */
export function setMailSender(s: Sender | null) { senderOverride = s }

/**
 * Directory where e-mails are saved when sending is disabled.
 * @returns Absolute path (`MAIL_OUTBOX_DIR` or default).
 */
export const outboxDir = () => process.env.MAIL_OUTBOX_DIR || path.join(__dirname, '../../outbox')

let smtp: { key: string; transport: Transporter } | null = null
function smtpTransport(): Transporter {
  const port = Number(process.env.SMTP_PORT) || 587
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465
  const user = process.env.SMTP_USER
  const key = [process.env.SMTP_HOST, port, secure, user, process.env.SMTP_PASSWORD].join('|')
  if (!smtp || smtp.key !== key) {
    smtp = {
      key,
      transport: nodemailer.createTransport({
        host: process.env.SMTP_HOST, port, secure,
        auth: user ? { user, pass: process.env.SMTP_PASSWORD } : undefined,
        connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000
      })
    }
  }
  return smtp.transport
}

const mailOptions = (m: MailMessage) => ({
  from: m.from, to: m.to, subject: m.subject, html: m.html, text: m.text,
  attachments: (m.attachments ?? []).map((a) => ({ cid: a.cid, filename: a.filename, content: a.content, contentType: 'image/jpeg', contentDisposition: 'inline' as const }))
})

/** Small JPEG of an item photo for the mail (mail clients do not show WebP/AVIF reliably). Null when the file is missing. */
export async function mailThumbnail(photo: string | null | undefined, size = 160): Promise<Buffer | null> {
  if (!photo || photo !== path.basename(photo)) return null
  try {
    return await sharp(path.join(uploadDir(), photo), { failOn: 'none' }).rotate()
      .resize(size, size, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
  } catch {
    return null
  }
}

async function sendToFile(m: MailMessage): Promise<void> {
  const dir = outboxDir()
  await fs.promises.mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safe = m.to.replace(/[^A-Za-z0-9@._-]/g, '_')
  const file = path.join(dir, `${stamp}-${safe}.eml`)
  const info = await nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' })
    .sendMail(mailOptions(m))
  await fs.promises.writeFile(file, info.message as Buffer)
}

async function deliver(m: MailMessage): Promise<void> {
  if (senderOverride) return senderOverride(m)
  if (!process.env.SMTP_HOST) return sendToFile(m)
  await smtpTransport().sendMail(mailOptions(m))
}

/**
 * Escapes text for use inside HTML.
 * @param s - Plain text.
 * @returns Escaped text.
 */
export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const rub = (n: number) => `${new Intl.NumberFormat('ru-RU').format(n).replace(/ /g, ' ')} ₽`

/** Replaces `{{key}}`; unknown keys become empty. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_m, k: string) => values[k] ?? '')
}

/**
 * Converts HTML to plain text for the text part of an e-mail.
 * @param html - HTML fragment.
 * @returns Plain text.
 */
export const htmlToText = (html: string) =>
  html.replace(/<\/td>\s*<td[^>]*>/gi, ' — ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|tr|li|h\d)>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n').trim()

/** Site style: black and white, system sans-serif, narrow column. */
export function layout(siteName: string, body: string, footer: string): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:0 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:28px 0 16px;border-bottom:2px solid #000000;font-size:28px;font-weight:bold;letter-spacing:1px">${escapeHtml(siteName)}</td></tr>
<tr><td style="padding:24px 0">${body}</td></tr>
<tr><td style="padding:16px 0 32px;border-top:1px solid #888888;color:#888888;font-size:13px">${footer}</td></tr>
</table></td></tr></table></body></html>`
}

async function settings(): Promise<Record<string, string>> {
  const rows = await db('setting').select('code', 'value')
  return Object.fromEntries(rows.map((r) => [r.code, r.value ?? '']))
}

/** Addresses of the managers from the setting: separated by comma, semicolon or space. */
export function managerRecipients(value: string | null | undefined): string[] {
  return (value ?? '').split(/[\s,;]+/).map((a) => a.trim()).filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a))
}

/**
 * Builds a tracking link from a template.
 * @param template - URL template with a track number placeholder.
 * @param track - Track number.
 * @returns The link, or null when there is no track number or template.
 */
export function trackingUrl(template: string, track: string | null | undefined): string | null {
  if (!track || !template) return null
  const url = template.replace(/\{\{\s*track\s*\}\}/g, encodeURIComponent(track))
  // Only web links go into the mail, whatever the setting holds.
  return /^https?:\/\//i.test(url) ? url : null
}

async function build(orderId: number, kind: MailKind): Promise<MailMessage> {
  const order = await db('order').where({ id: orderId }).first()
  if (!order) throw new Error('Order not found')
  const s = await settings()
  const items = await db('order_item as oi').join('item as i', 'i.id', 'oi.item_id').join('product as p', 'p.id', 'i.product_id')
    .where('oi.order_id', orderId).where((b) => b.where('oi.deleted', 0).orWhereNull('oi.deleted'))
    .select('oi.item_id', 'i.name', 'p.name as product_name', 'oi.quantity', 'oi.price').orderBy('oi.id')
  const attachments: MailImage[] = []
  const rowHtml: string[] = []
  for (const i of items) {
    const photo = await db('item_photo').where({ item_id: i.item_id }).where((b) => b.where('deleted', 0).orWhereNull('deleted'))
      .orderBy('priority').orderBy('id').first('photo')
    const thumb = await mailThumbnail(photo?.photo)
    const cid = `item-${i.item_id}@rechess`
    if (thumb) attachments.push({ cid, filename: `item-${i.item_id}.jpg`, content: thumb })
    const product = shortProductName(i.product_name)
    const img = thumb ? `<img src="cid:${cid}" width="80" height="80" alt="${escapeHtml(i.name)}" style="display:block;width:80px;height:80px;object-fit:cover">` : ''
    rowHtml.push(`<tr><td width="96" style="padding:8px 16px 8px 0;vertical-align:top">${img}</td>`
      + `<td style="padding:8px 0;vertical-align:top">${product ? `${escapeHtml(product)}<br>` : ''}${escapeHtml(i.name)} × ${i.quantity}</td>`
      + `<td align="right" style="padding:8px 0;vertical-align:top">${rub(i.price * i.quantity)}</td></tr>`)
  }
  const rows = rowHtml.join('')
  const url = trackingUrl(s['delivery.tracking_url'], order.delivery_reference)
  const cost = order.delivery_cost === null ? 'стоимость будет сообщена отдельно' : rub(order.delivery_cost)
  const where = order.address_delivery
    ? `до двери, ${order.delivery_address}` : `в пункт выдачи ${order.delivery_point_code ?? ''}, ${order.delivery_address}`
  const values: Record<string, string> = {
    number: String(order.number), name: escapeHtml(order.name), sum: rub(order.sum),
    delivery: escapeHtml(`${where} (${order.delivery_cost === null ? cost : `доставка ${cost}`})`),
    delivery_cost: escapeHtml(cost), city: escapeHtml(order.city ?? ''),
    track: escapeHtml(order.delivery_reference ?? ''), tracking_url: escapeHtml(url ?? ''),
    track_link: url ? `<a href="${escapeHtml(url)}" style="color:#000000;font-weight:bold">Отследить посылку</a>` : '',
    items: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border-top:1px solid #888888;border-bottom:1px solid #888888">${rows}</table>`
  }
  const siteName = s['site.name'] || 'reChess'
  const tplKey = kind === 'confirmation' ? 'order' : kind === 'track' ? 'track' : 'manager'
  const subjectTpl = s[`mail.${tplKey}.subject`]
  const bodyTpl = s[`mail.${tplKey}.body`]
  let to = order.e_mail
  if (kind === 'manager') {
    to = managerRecipients(s['mail.manager.to']).join(', ')
    if (!to) throw new Error('Не заданы адреса менеджеров (Настройки → Письма)')
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')
    Object.assign(values, {
      phone: escapeHtml(order.phone ?? ''), email: escapeHtml(order.e_mail ?? ''),
      name: escapeHtml(`${order.name ?? ''} ${order.family_name ?? ''}`.trim()),
      comment: escapeHtml(order.comment || '—'), cms_link: escapeHtml(`${base}/cms#orders/${order.id}`),
      date: new Date(order.date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
      payment: escapeHtml(order.payment_state === 'paid' ? 'оплачен' : 'не оплачен')
    })
  }
  const body = fill(bodyTpl, values)
  const contacts = [s['contact.email'], s['contact.phone']].filter(Boolean).map(escapeHtml).join(' · ')
  const html = layout(siteName, body, contacts || escapeHtml(siteName))
  const fromName = s['mail.from_name'] || siteName
  const fromAddr = process.env.MAIL_FROM || 'noreply@localhost'
  return {
    to,
    subject: fill(subjectTpl, { ...values, name: kind === 'manager' ? values.name : order.name }).replace(/&amp;/g, '&'),
    html, text: htmlToText(body), attachments,
    from: `"${fromName.replace(/"/g, '')}" <${fromAddr}>`
  }
}

/** Sends the mail and stores the result in the order. Never throws. Returns true on success. */
export async function sendOrderMail(orderId: number, kind: MailKind): Promise<boolean> {
  const column = kind
  try {
    const message = await build(orderId, kind)
    await deliver(message)
    const marks: Record<string, unknown> = { [`${column}_sent_at`]: db.fn.now(), [`${column}_error`]: null }
    if (kind === 'track') {
      const o = await db('order').where({ id: orderId }).first('delivery_reference')
      marks.track_sent_ref = o?.delivery_reference ?? null
    }
    await db('order').where({ id: orderId }).update(marks)
    return true
  } catch (e) {
    const text = String((e as Error)?.message ?? e).slice(0, 500)
    console.error(`Mail ${kind} for order ${orderId} failed: ${text}`)
    try {
      await db('order').where({ id: orderId }).update({ [`${column}_error`]: text })
    } catch { /* the order stays as it is */ }
    return false
  }
}
