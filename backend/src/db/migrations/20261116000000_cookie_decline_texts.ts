import type { Knex } from 'knex'
import { COOKIE_POLICY } from '../legal_texts_2026'

/**
 * Customer's correction: «Отклонить» refuses only the analytics (Metrika, VK). The technical cookies of the cart
 * and the order always work, the order is placed as usual. The banner and the cookie policy (column 2 of the legal page) say so.
 * The banner text is replaced only while it is the previous default, an edited text stays. `down` does nothing.
 */
const PREV_TEXT = 'Мы используем файлы cookie: необходимые для работы сайта и корзины, а с вашего согласия — аналитические (Яндекс Метрика, VK). Нажимая «Принять», вы соглашаетесь на их использование. Подробнее — в <a href="/privacy#cookie">политике использования файлов cookie</a>.'
const NEW_TEXT = 'Мы используем технические файлы cookie: они нужны для работы сайта и корзины. Аналитические (Яндекс Метрика, VK) включаются только с вашего согласия: от них можно отказаться, сайт и заказ работают в любом случае. Подробнее — в <a href="/privacy#cookie">политике использования файлов cookie</a>.'

export async function up(knex: Knex): Promise<void> {
  await knex('setting').where({ code: 'cookie.banner.text', value: PREV_TEXT }).update({ value: NEW_TEXT })
  const page = await knex('page').where({ slug: 'privacy' }).first('id')
  if (!page) return
  const blocks = await knex('page_block').where({ page_id: page.id }).select('id', 'content')
  for (const b of blocks) {
    const content = typeof b.content === 'string' ? JSON.parse(b.content) : b.content
    const cols = content?.columns
    if (!Array.isArray(cols) || cols.length < 3) continue
    cols[1] = COOKIE_POLICY
    await knex('page_block').where({ id: b.id }).update({ content: JSON.stringify(content) })
  }
}

export async function down(): Promise<void> {
  // The previous texts are kept in git history only.
}
