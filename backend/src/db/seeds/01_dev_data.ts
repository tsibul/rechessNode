import type { Knex } from 'knex'
import { hashPassword } from '../../utils/password'

/**
 * Development data only. Refuses to run in production.
 * Reference data (roles, order states, pages, settings) comes from the migration.
 * Passwords use the final scheme from utils/password.
 */

const TEST_PASSWORD = 'dev-password-1'

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

  await knex.raw('SET FOREIGN_KEY_CHECKS = 0')
  for (const table of CLEARED) {
    await knex(table).delete()
    await knex.raw(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`)
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1')

  // ---- catalogue --------------------------------------------------------
  const [productId] = await knex('product').insert({
    name: 'Шахматы reChess',
    description: 'Авторские шахматы из переработанных материалов'
  })

  const colors = [
    { name: 'Чёрный', code: '01', hex: '1A1A1A' },
    { name: 'Белый', code: '02', hex: 'F2F2F2' },
    { name: 'Красный', code: '03', hex: 'C0392B' },
    { name: 'Синий', code: '04', hex: '2C5DA8' }
  ]
  const colorIds: number[] = []
  for (const color of colors) {
    const [id] = await knex('color').insert(color)
    colorIds.push(id)
  }

  const pairs = [
    { name: 'Чёрный и белый', main_color: colorIds[0], second_color: colorIds[1] },
    { name: 'Красный и синий', main_color: colorIds[2], second_color: colorIds[3] },
    { name: 'Чёрный и красный', main_color: colorIds[0], second_color: colorIds[2] }
  ]
  const itemIds: number[] = []
  for (const pair of pairs) {
    const [id] = await knex('item').insert({ ...pair, product_id: productId })
    itemIds.push(id)
  }

  await knex('price').insert([
    { product_id: productId, price: 9000, price_date: '2025-01-01 00:00:00' },
    { product_id: productId, price: 9900, price_date: '2025-09-01 00:00:00' }
  ])

  await knex('item_photo').insert(
    itemIds.map((itemId, i) => ({
      name: `Фото пары ${i + 1}`, priority: 10, photo: `item-${i + 1}.jpg`, item_id: itemId
    }))
  )
  await knex('index_photo').insert([
    { name: 'Главная 1', priority: 10, photo: 'index-1.jpg' },
    { name: 'Главная 2', priority: 20, photo: 'index-2.jpg' }
  ])

  // ---- shops and seller -------------------------------------------------
  const [shopA] = await knex('shops').insert({
    name: 'Магазин настольных игр', address: 'Москва, ул. Тестовая, 1',
    working_hours: 'Пн–Пт 10–20, Сб 11–18', phone: '+74950000001', web_site: 'https://example.com'
  })
  const [shopB] = await knex('shops').insert({
    name: 'Подарки и сувениры', address: 'Казань, ул. Образцовая, 5',
    working_hours: 'Ежедневно 10–19', phone: '+78430000002'
  })
  await knex('shop_photo').insert([
    { name: 'Витрина', priority: 10, photo: 'shop-1.jpg', shop_id: shopA },
    { name: 'Зал', priority: 20, photo: 'shop-2.jpg', shop_id: shopA },
    { name: 'Витрина', priority: 10, photo: 'shop-3.jpg', shop_id: shopB }
  ])

  await knex('seller').insert({
    name: 'ООО «Тестовый продавец»', ogrn: '1000000000000', inn: '7700000000',
    kpp: '770001001', address: 'Москва, ул. Тестовая, 1', phone: '+74950000000'
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
  const pages = await knex('page').select('id', 'slug', 'name')
  const pageId = (slug: string) => pages.find((p) => p.slug === slug)!.id
  await knex('page_block').insert([
    { page_id: pageId('index'), code: 'hero', priority: 10, content: JSON.stringify({ title: 'reChess', text: 'Дизайнерские шахматы' }) },
    { page_id: pageId('index'), code: 'gallery', priority: 20, content: JSON.stringify({ title: 'Галерея' }) },
    { page_id: pageId('about'), code: 'text', priority: 10, content: JSON.stringify({ html: '<p>О проекте</p>' }) },
    { page_id: pageId('privacy'), code: 'text', priority: 10, content: JSON.stringify({ html: '<p>Политика</p>' }) }
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
