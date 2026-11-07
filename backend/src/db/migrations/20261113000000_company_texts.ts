import type { Knex } from 'knex'

/**
 * Texts the customer asked to correct after testing:
 * - the order stub text now ends with "Нажмите «Оплатить»" (only a value that is still the old default is replaced);
 * - setting company.about: own text of the "О компании" window (the legal details are a separate window);
 * - the company name in the privacy policy and the personal data policy becomes {{company}}
 *   and is filled in from the seller name (CMS, "Сайт" → "Продавец"). The legal details column is left as it is.
 */
const OLD_STUB = 'Оплата на сайте пока не подключена. Мы свяжемся с вами по телефону или почте, уточним детали заказа и расскажем, как оплатить.'
const NEW_STUB = 'Оплата на сайте пока не подключена: после заказа мы свяжемся с вами по телефону или почте и уточним детали. Нажмите «Оплатить», если вы согласны.'
const ABOUT = '<p>ReChess — шахматы из переработанной тетрапак-упаковки. Фигуры сделаны из полиалюминия, который получается при переработке упаковки: то, что было незаметным, возвращается в игру.</p><p>Данные продавца и реквизиты — в разделе «Юридическая информация».</p>'
const NAME = /ООО[\s\u00a0]«Вики Восток Сувенир»/g

function fill(value: unknown, skipFirst: boolean): unknown {
  if (typeof value === 'string') return value.replace(NAME, '{{company}}')
  if (Array.isArray(value)) return value.map((v, i) => (skipFirst && i === 0 ? v : fill(v, false)))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'columns' ? fill(v, true) : fill(v, false)]))
  }
  return value
}

export async function up(knex: Knex): Promise<void> {
  await knex('setting').where({ code: 'shop.order_stub_text', value: OLD_STUB }).update({ value: NEW_STUB })
  if (!(await knex('setting').where({ code: 'company.about' }).first('id'))) {
    await knex('setting').insert({ code: 'company.about', name: 'Текст окна «О компании»', type: 'html', group_name: 'Сайт', priority: 30, value: ABOUT })
  }
  const pages = await knex('page').whereIn('slug', ['privacy', 'personal-data']).select('id')
  const blocks = await knex('page_block').whereIn('page_id', pages.map((p) => p.id)).select('id', 'content')
  for (const b of blocks) {
    const content = typeof b.content === 'string' ? JSON.parse(b.content) : b.content
    const next = JSON.stringify(fill(content, false))
    if (next !== JSON.stringify(content)) await knex('page_block').where({ id: b.id }).update({ content: next })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('setting').where({ code: 'company.about' }).delete()
  await knex('setting').where({ code: 'shop.order_stub_text', value: NEW_STUB }).update({ value: OLD_STUB })
}
