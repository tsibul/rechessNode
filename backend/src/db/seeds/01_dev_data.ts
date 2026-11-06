import type { Knex } from 'knex'
import * as fs from 'fs'
import * as path from 'path'
import { hashPassword } from '../../utils/password'
import { uploadDir } from '../../routes/cms/uploads'

/**
 * Development data only. Refuses to run in production.
 * Reference data (roles, order states, pages, settings) comes from the migration.
 * Passwords use the final scheme from utils/password.
 */

// Obviously fake registration numbers (all zeros, no valid check digit): they must not pass for real ones.
const TEST_OGRN = '0000000000000'
const TEST_KPP = '000000000'
const TEST_PASSWORD = 'dev-password-1'

// Site photos and texts from the Figma file live in the frontend package.
const FRONTEND = path.resolve(__dirname, '../../../../frontend')
const MEDIA = path.join(FRONTEND, 'public/media')
const figma = JSON.parse(fs.readFileSync(path.join(FRONTEND, 'src/data/content.json'), 'utf8'))

/** Copies the site photos (jpg, webp, avif) to the upload folder, so `/uploads/<name>` serves them. */
function copyMedia(): void {
  fs.mkdirSync(uploadDir(), { recursive: true })
  for (const file of fs.readdirSync(MEDIA)) fs.copyFileSync(path.join(MEDIA, file), path.join(uploadDir(), file))
}

const pad = (n: number) => String(n).padStart(2, '0')

// Hex values are measured on the pair photos of the Figma file (frame 2724:75), median of the piece pixels.
const PAIRS: Array<[string, [string, string, string], [string, string, string]]> = [
  ['01 пепельный / 02 антрацитовый', ['пепельный', '01', 'A5AAA9'], ['антрацитовый', '02', '535454']],
  ['01 пепельный / 04 терракотовый', ['пепельный', '01', 'A5AAA9'], ['терракотовый', '04', 'CA5C78']],
  ['01 пепельный / 10 бирюзовый', ['пепельный', '01', 'A5AAA9'], ['бирюзовый', '10', '46988F']],
  ['09 изумрудный / 02 антрацитовый', ['изумрудный', '09', '64BE86'], ['антрацитовый', '02', '535454']],
  ['03 охристый / 19 карминовый', ['охристый', '03', 'BBAB50'], ['карминовый', '19', 'B45656']],
  ['01 пепельный / 19 карминовый', ['пепельный', '01', 'A5AAA9'], ['карминовый', '19', 'B45656']],
  ['01 пепельный / 06 аквамариновый', ['пепельный', '01', 'A5AAA9'], ['аквамариновый', '06', '5D9DB8']]
]

// Tables cleared in child-first order. Reference tables are not touched.
const CLEARED = [
  'publication', 'cart_item', 'cart', 'order_item', 'order', 'client',
  'item_photo', 'shop_photo', 'index_photo', 'shops', 'price', 'item',
  'color', 'product', 'seller', 'seo', 'page_block', 'user'
]

export async function seed(knex: Knex): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed must not run in production')
  }

  copyMedia()
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0')
  for (const table of CLEARED) {
    await knex(table).delete()
    await knex.raw(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`)
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1')

  // ---- catalogue --------------------------------------------------------
  const [productId] = await knex('product').insert({
    name: figma.product.name,
    description: figma.product.description
  })

  const colorIds = new Map<string, number>()
  for (const [, main, second] of PAIRS) {
    for (const [name, code, hex] of [main, second]) {
      if (colorIds.has(code)) continue
      const [id] = await knex('color').insert({ name, code, hex })
      colorIds.set(code, id)
    }
  }

  const itemIds: number[] = []
  for (const [name, main, second] of PAIRS) {
    const [id] = await knex('item').insert({
      name, product_id: productId, main_color: colorIds.get(main[1]), second_color: colorIds.get(second[1])
    })
    itemIds.push(id)
  }

  await knex('price').insert([
    { product_id: productId, price: 5000, price_date: '2025-01-01 00:00:00' },
    { product_id: productId, price: figma.product.price, price_date: '2025-09-01 00:00:00' }
  ])

  await knex('item_photo').insert(
    itemIds.flatMap((itemId, i) => ([
      { name: `${PAIRS[i][0]}, фигуры сбоку`, priority: 10, photo: `pair-${i + 1}.jpg`, slot: 'side', item_id: itemId },
      { name: `${PAIRS[i][0]}, фигуры сверху`, priority: 20, photo: `top-${i + 1}.jpg`, slot: 'top', item_id: itemId },
      { name: `${PAIRS[i][0]}, доска с фигурами`, priority: 30, photo: `board-${i + 1}.jpg`, slot: 'board', item_id: itemId }
    ]))
  )
  await knex('index_photo').insert(
    Array.from({ length: 32 }, (_, i) => ({ name: `Фото ${i + 1}`, priority: (i + 1) * 10, photo: `index-${pad(i + 1)}.jpg` }))
  )

  // ---- shops and seller -------------------------------------------------
  await knex('shops').insert({
    name: 'ГЭС-2', address: 'Болотная набережная, вл. 15, к. 1',
    working_hours: '11:00–23:00, ежедневно', web_site: 'https://ges-2.org'
  })

  await knex('seller').insert({
    name: 'ООО «Вики Восток Сувенир»', ogrn: TEST_OGRN, inn: '5001021228',
    kpp: TEST_KPP, address: 'Московская область, Балашиха, деревня Полтево, владение 115', phone: figma.footer.phone
  })

  // ---- users ------------------------------------------------------------
  const roles = await knex('role').select('id', 'code')
  const roleId = (code: string) => roles.find((r) => r.code === code)!.id
  await knex('user').insert([
    { name: 'Администратор', login: 'admin', password: await hashPassword(TEST_PASSWORD), role_id: roleId('admin') },
    { name: 'Менеджер', login: 'manager', password: await hashPassword(TEST_PASSWORD), role_id: roleId('manager') },
    { name: 'Старший менеджер', login: 'senior', password: await hashPassword(TEST_PASSWORD), role_id: roleId('senior_manager') }
  ])

  // ---- pages, SEO -------------------------------------------------------
  const pages = await knex('page').where({ deleted: false }).select('id', 'slug', 'name')
  const pageId = (slug: string) => pages.find((p) => p.slug === slug)!.id
  const shopPhotos = [1, 2, 3, 4, 5, 6].map((k) => ({ name: `Шахматы ReChess ${k}`, photo: `shop-${k}.jpg`, ratio: k === 5 ? 1080 / 860 : 860 / 1080 }))
  await knex('page_block').insert([
    { page_id: pageId('index'), code: 'gallery', priority: 10, content: JSON.stringify({}) },
    { page_id: pageId('about'), code: 'text', priority: 10, content: JSON.stringify({ title: 'О проекте', hide_title: true, html: figma.about_html }) },
    { page_id: pageId('shop'), code: 'product', priority: 10, content: JSON.stringify({}) },
    { page_id: pageId('shop'), code: 'gallery', priority: 20, content: JSON.stringify({ photos: shopPhotos }) },
    { page_id: pageId('colors'), code: 'text', priority: 10, content: JSON.stringify({ title: 'Цвета', hide_title: true, html: `<p>${figma.colors_intro.name.replace('\n', '<br>')}</p><p>${figma.colors_intro.description}</p>` }) },
    { page_id: pageId('colors'), code: 'colors', priority: 20, content: JSON.stringify({}) },
    { page_id: pageId('personal-data'), code: 'text', priority: 10, content: JSON.stringify({ title: figma.personal_data.title, html: figma.personal_data.html }) },
    { page_id: pageId('privacy'), code: 'columns', priority: 10, content: JSON.stringify({ title: 'Политика конфиденциальности', columns: figma.legal }) }
  ])
  await knex('seo').insert(
    pages.map((p) => ({
      page_id: p.id,
      title: `${p.name} — reChess`,
      description: `${p.name}: авторские шахматы reChess`,
      robots_index: p.slug !== 'cart'
    }))
  )

  // ---- client, cart, order ----------------------------------------------
  const [clientId] = await knex('client').insert({
    tokenHash: 'dev-token-hash-1', name: 'Иван', family_name: 'Тестов', city: 'Москва',
    phone: '+79990000001', e_mail: 'ivan@example.com', address_delivery: true,
    delivery_address: 'Москва, ул. Тестовая, 10, кв. 5'
  })
  const [cartId] = await knex('cart').insert({ client_id: clientId, sum: 9900 })
  await knex('cart_item').insert({ cart_id: cartId, item_id: itemIds[0], quantity: 1 })

  const states = await knex('order_state').orderBy('priority')
  const [orderId] = await knex('order').insert({
    number: 1001, client_id: clientId, sum: 10400, delivery_cost: 500,
    name: 'Иван', family_name: 'Тестов', city: 'Москва', phone: '+79990000001', e_mail: 'ivan@example.com',
    delivery_address: 'Москва, ул. Тестовая, 10, кв. 5', address_delivery: true,
    order_state_id: states[0].id, comment: 'Позвоните перед доставкой',
    consent_version: 'dev-1'
  })
  await knex('order_item').insert({ order_id: orderId, item_id: itemIds[0], quantity: 1, price: 9900 })
}
