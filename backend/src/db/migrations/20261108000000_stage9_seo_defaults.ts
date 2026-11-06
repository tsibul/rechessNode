/**
 * Stage 9: default SEO texts for the pages and the settings the SEO output needs.
 * Texts are written for the site; the CMS edits them. Rows that already exist are left alone.
 * The same texts are the build-time fallback in frontend/src/data/fixtures.ts.
 */
import type { Knex } from 'knex'

const SEO: Array<{ slug: string; title: string; description: string; robots_index: boolean }> = [
  {
    slug: 'index', robots_index: true,
    title: 'reChess — дизайнерские шахматы из переработанного пластика',
    description: 'Авторские шахматы reChess: уникальный дизайн, переработанный пластик, ручная доводка. Выберите пару цветов и закажите онлайн.'
  },
  {
    slug: 'about', robots_index: true,
    title: 'О проекте reChess — как делают шахматы из переработанного пластика',
    description: 'История проекта reChess: как отходы производства превращаются в шахматные фигуры, из чего и кем сделаны наши шахматы.'
  },
  {
    slug: 'shop', robots_index: true,
    title: 'Купить шахматы reChess — цена, цвета, доставка',
    description: 'Шахматы reChess из переработанного пластика: выберите пару цветов, узнайте цену и закажите с доставкой по России.'
  },
  {
    slug: 'where-to-buy', robots_index: true,
    title: 'Где купить шахматы reChess — магазины-партнёры',
    description: 'Магазины-партнёры, где можно посмотреть и купить шахматы reChess: адреса, часы работы, телефоны.'
  },
  {
    slug: 'privacy', robots_index: true,
    title: 'Политика конфиденциальности — reChess',
    description: 'Какие данные получает сайт reChess, как они используются и как их удалить.'
  },
  {
    slug: 'personal-data', robots_index: true,
    title: 'Согласие на обработку персональных данных — reChess',
    description: 'Условия согласия на обработку персональных данных при оформлении заказа на сайте reChess.'
  },
  {
    slug: 'cart', robots_index: false,
    title: 'Корзина — reChess',
    description: 'Корзина покупателя reChess. Служебная страница, в поиске не показывается.'
  }
]

const SETTINGS: Array<[string, string, string, string, number]> = [
  ['seo.og_image', 'Картинка для соцсетей по умолчанию (имя файла или адрес)', 'text', 'Сайт', 30],
  ['social.vk', 'Страница VK (адрес)', 'text', 'Соцсети', 20]
]

export async function up(knex: Knex): Promise<void> {
  const pages = await knex('page').select('id', 'slug')
  for (const row of SEO) {
    const page = pages.find((p) => p.slug === row.slug)
    if (!page) continue
    if (await knex('seo').where({ page_id: page.id }).first('id')) continue
    await knex('seo').insert({
      page_id: page.id, title: row.title, description: row.description, robots_index: row.robots_index
    })
  }
  for (const [code, name, type, group_name, priority] of SETTINGS) {
    if (await knex('setting').where({ code }).first('id')) continue
    await knex('setting').insert({ code, name, type, group_name, priority })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('setting').whereIn('code', SETTINGS.map((s) => s[0])).whereNull('value').delete()
  // SEO rows are content: they are not removed on rollback.
}
