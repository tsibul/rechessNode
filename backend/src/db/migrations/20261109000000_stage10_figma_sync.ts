/**
 * Stage 10: pages and settings after the layout check against Figma.
 * - the page `colors` (grid of colour pairs, add to cart) appears;
 * - `where-to-buy` is no longer a page: "Где купить" is a block of the shop page (the page is soft-deleted);
 * - settings for the texts of the shop page.
 * Texts live in frontend/src/data/fixtures.ts (build-time fallback) and are edited in the CMS.
 */
import type { Knex } from 'knex'

const COLORS_SEO = {
  title: 'Цвета шахмат reChess — семь цветовых пар',
  description: 'Семь вариантов цветовых пар шахматного набора reChess из полиалюминия: выберите сочетание и добавьте набор в корзину.'
}

const SETTINGS: Array<[string, string, string, string, number]> = [
  ['footer.credit', 'Подпись в подвале', 'text', 'Контакты', 40],
  ['contact.instagram', 'Instagram (подпись)', 'text', 'Контакты', 50],
  ['shop.buy_note', 'Магазин: как приобрести', 'html', 'Магазин', 10],
  ['shop.corporate_title', 'Магазин: заголовок корпоративных заказов', 'text', 'Магазин', 20],
  ['shop.corporate', 'Магазин: корпоративные заказы', 'html', 'Магазин', 30]
]

export async function up(knex: Knex): Promise<void> {
  let colors = await knex('page').where({ slug: 'colors' }).first('id')
  if (!colors) {
    const [id] = await knex('page').insert({ slug: 'colors', name: 'Цвета' })
    colors = { id }
  }
  if (!(await knex('seo').where({ page_id: colors.id }).first('id'))) {
    await knex('seo').insert({ page_id: colors.id, ...COLORS_SEO, robots_index: true })
  }

  const where = await knex('page').where({ slug: 'where-to-buy' }).first('id')
  if (where) {
    await knex('page').where({ id: where.id }).update({ deleted: true })
    await knex('seo').where({ page_id: where.id }).update({ deleted: true })
  }

  for (const [code, name, type, group_name, priority] of SETTINGS) {
    if (await knex('setting').where({ code }).first('id')) continue
    await knex('setting').insert({ code, name, type, group_name, priority })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('setting').whereIn('code', SETTINGS.map((s) => s[0])).whereNull('value').delete()
  const where = await knex('page').where({ slug: 'where-to-buy' }).first('id')
  if (where) {
    await knex('page').where({ id: where.id }).update({ deleted: false })
    await knex('seo').where({ page_id: where.id }).update({ deleted: false })
  }
  // The page `colors` is content: it is not removed on rollback.
}
