import type { Knex } from 'knex'

/**
 * Cookie texts after the customer's remarks:
 * - the consent banner says which cookies are used, why, links to the cookie policy (/privacy#cookie)
 *   and has the button «Принять». Only an empty value or the old default is replaced, an edited text stays;
 * - the contact address in the cookie policy (second column of the legal page) becomes {{email}}
 *   and is filled in from the new setting legal.email (group «Документы») when the site is built. The text itself is not changed.
 */
const OLD_TEXT = 'Этот сайт использует файлы cookie. Подробнее — в <a href="/privacy">политике конфиденциальности</a>.'
const NEW_TEXT = 'Мы используем файлы cookie: необходимые для работы сайта и корзины, а с вашего согласия — аналитические (Яндекс Метрика, VK). Нажимая «Принять», вы соглашаетесь на их использование. Подробнее — в <a href="/privacy#cookie">политике использования файлов cookie</a>.'
const EMAIL = 'info@rechess.ru'

async function replaceDefault(knex: Knex, code: string, olds: string[], value: string): Promise<void> {
  const row = await knex('setting').where({ code }).first('value')
  if (row && (row.value === null || row.value === '' || olds.includes(row.value))) await knex('setting').where({ code }).update({ value })
}

export async function up(knex: Knex): Promise<void> {
  await replaceDefault(knex, 'cookie.banner.text', [OLD_TEXT], NEW_TEXT)
  await replaceDefault(knex, 'cookie.banner.button', ['Ок'], 'Принять')
  if (!(await knex('setting').where({ code: 'legal.email' }).first('id'))) {
    await knex('setting').insert({ code: 'legal.email', name: 'Почта для обращений по политикам', type: 'text', group_name: 'Документы', priority: 20, value: EMAIL })
  }
  const page = await knex('page').where({ slug: 'privacy' }).first('id')
  if (!page) return
  const blocks = await knex('page_block').where({ page_id: page.id }).select('id', 'content')
  for (const b of blocks) {
    const content = typeof b.content === 'string' ? JSON.parse(b.content) : b.content
    const cols = content?.columns
    if (!Array.isArray(cols) || typeof cols[1] !== 'string' || !cols[1].includes(EMAIL)) continue
    cols[1] = cols[1].split(EMAIL).join('{{email}}')
    await knex('page_block').where({ id: b.id }).update({ content: JSON.stringify(content) })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('setting').where({ code: 'legal.email' }).delete()
  await knex('setting').where({ code: 'cookie.banner.text', value: NEW_TEXT }).update({ value: OLD_TEXT })
  await knex('setting').where({ code: 'cookie.banner.button', value: 'Принять' }).update({ value: 'Ок' })
}
