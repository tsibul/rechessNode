import type { Knex } from 'knex'

/**
 * Stage 3 data model, see docs/DATA_MODEL.md.
 * Adds products, roles, pages, SEO, settings and publications, and extends
 * the tables created by the init migration.
 */

const ROLES = [
  {
    code: 'admin',
    name: 'Администратор',
    permissions: ['orders', 'clients', 'carts', 'references', 'prices', 'seo', 'pages', 'settings', 'users', 'publish']
  },
  { code: 'manager', name: 'Менеджер', permissions: ['orders', 'clients', 'carts'] },
  {
    code: 'senior_manager',
    name: 'Старший менеджер',
    permissions: ['orders', 'clients', 'carts', 'references', 'prices', 'seo', 'publish']
  }
]

const ORDER_STATES = [
  { name: 'Новый', priority: 10 },
  { name: 'Подтверждён', priority: 20 },
  { name: 'В производстве', priority: 30 },
  { name: 'Передан в доставку', priority: 40 },
  { name: 'Доставлен', priority: 50 },
  { name: 'Отменён', priority: 60 }
]

const PAGES = [
  { slug: 'index', name: 'Главная' },
  { slug: 'about', name: 'О проекте' },
  { slug: 'shop', name: 'Товар' },
  { slug: 'where-to-buy', name: 'Где купить' },
  { slug: 'cart', name: 'Корзина' },
  { slug: 'privacy', name: 'Политика конфиденциальности' },
  { slug: 'personal-data', name: 'Обработка персональных данных' }
]

// code, name, type, group, priority
const SETTINGS: Array<[string, string, string, string, number]> = [
  ['site.name', 'Название сайта', 'text', 'Сайт', 10],
  ['site.url', 'Адрес сайта', 'text', 'Сайт', 20],
  ['contact.email', 'E-mail для связи', 'text', 'Контакты', 10],
  ['contact.phone', 'Телефон', 'text', 'Контакты', 20],
  ['contact.whatsapp', 'Ссылка WhatsApp', 'text', 'Контакты', 30],
  ['social.twitter', 'Аккаунт twitter:site', 'text', 'Соцсети', 10],
  ['counter.metrika', 'Номер счётчика Метрики', 'text', 'Счётчики', 10],
  ['counter.vk', 'Номер счётчика VK', 'text', 'Счётчики', 20],
  ['cookie.banner.text', 'Текст cookie-баннера', 'html', 'Баннер', 10],
  ['cookie.banner.button', 'Кнопка cookie-баннера', 'text', 'Баннер', 20],
  ['legal.consent_version', 'Редакция политики для согласия', 'text', 'Документы', 10],
  ['mail.from_name', 'Имя отправителя писем', 'text', 'Письма', 10],
  ['mail.order.subject', 'Письмо с подтверждением: тема', 'text', 'Письма', 20],
  ['mail.order.body', 'Письмо с подтверждением: текст', 'html', 'Письма', 30],
  ['mail.track.subject', 'Письмо с треком: тема', 'text', 'Письма', 40],
  ['mail.track.body', 'Письмо с треком: текст', 'html', 'Письма', 50]
]

/** Columns without a usable default cannot be added to filled tables. */
async function assertEmpty(knex: Knex, table: string, why: string): Promise<void> {
  const row = await knex(table).count({ c: '*' }).first()
  if (Number(row?.c) > 0) {
    throw new Error(`Table "${table}" has rows, cannot add required column: ${why}`)
  }
}

export async function up(knex: Knex): Promise<void> {
  // ---- new tables -------------------------------------------------------
  await knex.schema.createTable('product', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.text('description').nullable()
    table.boolean('deleted').notNullable().defaultTo(false)
  })

  await knex.schema.createTable('role', (table) => {
    table.increments('id')
    table.string('code', 50).notNullable().unique()
    table.string('name', 255).notNullable()
    table.boolean('deleted').notNullable().defaultTo(false)
  })

  await knex.schema.createTable('role_permission', (table) => {
    table.integer('role_id').unsigned().notNullable()
    table.string('permission', 50).notNullable()
    table.primary(['role_id', 'permission'])
    table.foreign('role_id').references('id').inTable('role')
  })

  await knex.schema.createTable('page', (table) => {
    table.increments('id')
    table.string('slug', 255).notNullable().unique()
    table.string('name', 255).notNullable()
    table.boolean('deleted').notNullable().defaultTo(false)
  })

  await knex.schema.createTable('page_block', (table) => {
    table.increments('id')
    table.integer('page_id').unsigned().notNullable()
    table.string('code', 100).notNullable()
    table.smallint('priority').notNullable()
    table.json('content').nullable()
    table.boolean('deleted').notNullable().defaultTo(false)
    table.foreign('page_id').references('id').inTable('page')
    table.unique(['page_id', 'code'])
  })

  await knex.schema.createTable('seo', (table) => {
    table.increments('id')
    table.integer('page_id').unsigned().notNullable().unique()
    table.string('title', 255).notNullable()
    table.string('description', 500).notNullable()
    table.string('og_title', 255).nullable()
    table.string('og_description', 500).nullable()
    table.string('og_image', 255).nullable()
    table.boolean('robots_index').notNullable().defaultTo(true)
    table.boolean('deleted').notNullable().defaultTo(false)
    table.foreign('page_id').references('id').inTable('page')
  })

  await knex.schema.createTable('setting', (table) => {
    table.increments('id')
    table.string('code', 100).notNullable().unique()
    table.string('name', 255).notNullable()
    table.string('type', 20).notNullable()
    table.text('value').nullable()
    table.string('group_name', 100).nullable()
    table.smallint('priority').notNullable()
    table.boolean('deleted').notNullable().defaultTo(false)
  })

  await knex.schema.createTable('publication', (table) => {
    table.increments('id')
    table.string('state', 20).notNullable()
    table.integer('started_by').unsigned().nullable()
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('finished_at').nullable()
    table.text('log').nullable()
    table.foreign('started_by').references('id').inTable('user')
  })

  // ---- initial data -----------------------------------------------------
  for (const role of ROLES) {
    const [roleId] = await knex('role').insert({ code: role.code, name: role.name })
    await knex('role_permission').insert(
      role.permissions.map((permission) => ({ role_id: roleId, permission }))
    )
  }
  await knex('order_state').insert(ORDER_STATES)
  await knex('page').insert(PAGES)
  await knex('setting').insert(
    SETTINGS.map(([code, name, type, group_name, priority]) => ({ code, name, type, group_name, priority }))
  )

  // ---- product link for item and price ----------------------------------
  await knex.schema.alterTable('item', (table) => {
    table.integer('product_id').unsigned().nullable()
  })
  await knex.schema.alterTable('price', (table) => {
    table.integer('product_id').unsigned().nullable()
  })
  const hasPairs = Number((await knex('item').count({ c: '*' }).first())?.c) > 0
  const hasPrices = Number((await knex('price').count({ c: '*' }).first())?.c) > 0
  if (hasPairs || hasPrices) {
    const [productId] = await knex('product').insert({ name: 'Шахматы reChess' })
    await knex('item').update({ product_id: productId })
    await knex('price').update({ product_id: productId })
  }
  await knex.schema.alterTable('item', (table) => {
    table.integer('product_id').unsigned().notNullable().alter()
    table.foreign('product_id').references('id').inTable('product')
    table.unique(['product_id', 'main_color', 'second_color'])
  })
  await knex.schema.alterTable('price', (table) => {
    table.integer('product_id').unsigned().notNullable().alter()
    table.foreign('product_id').references('id').inTable('product')
    table.index(['product_id', 'price_date'])
    table.dropColumn('item')
  })

  // ---- photos, shops, seller --------------------------------------------
  await assertEmpty(knex, 'shop_photo', 'shop_id has no source value')
  await knex.schema.alterTable('shop_photo', (table) => {
    table.integer('shop_id').unsigned().notNullable()
    table.foreign('shop_id').references('id').inTable('shops')
    table.index('shop_id')
  })

  await knex.schema.alterTable('shops', (table) => {
    table.dropColumn('start_working')
    table.dropColumn('end_working')
    table.string('working_hours', 255).nullable()
  })

  await assertEmpty(knex, 'seller', 'name has no source value')
  await knex.schema.alterTable('seller', (table) => {
    table.string('name', 255).notNullable()
  })

  // ---- user role --------------------------------------------------------
  await knex.schema.alterTable('user', (table) => {
    table.integer('role_id').unsigned().nullable()
  })
  const admin = await knex('role').where({ code: 'admin' }).first()
  await knex('user').update({ role_id: admin.id })
  await knex.schema.alterTable('user', (table) => {
    table.integer('role_id').unsigned().notNullable().alter()
    table.foreign('role_id').references('id').inTable('role')
  })

  // ---- client -----------------------------------------------------------
  await knex.schema.alterTable('client', (table) => {
    table.string('delivery_point_code', 50).nullable()
    table.dropColumn('comment')
  })

  // ---- order and order_item ---------------------------------------------
  await assertEmpty(knex, 'order', 'contact snapshot and consent have no source value')
  await assertEmpty(knex, 'order_item', 'price has no source value')
  await knex.schema.alterTable('order', (table) => {
    table.string('name', 255).notNullable()
    table.string('family_name', 255).nullable()
    table.string('city', 255).nullable()
    table.string('phone', 20).notNullable()
    table.string('e_mail', 255).notNullable()
    table.string('delivery_point_code', 50).nullable()
    table.integer('delivery_cost').nullable()
    table.string('payment_state', 32).notNullable().defaultTo('not_paid')
    table.string('comment', 1000).nullable()
    table.timestamp('consent_at').notNullable().defaultTo(knex.fn.now())
    table.string('consent_version', 50).nullable()
    table.unique(['number'])
  })
  await knex.schema.alterTable('order_item', (table) => {
    table.integer('price').notNullable()
  })

  // ---- cart -------------------------------------------------------------
  await knex.schema.alterTable('cart', (table) => {
    table.integer('sum').notNullable().defaultTo(0).alter()
    table.index('last_updated')
  })
  await knex.schema.alterTable('cart_item', (table) => {
    table.unique(['cart_id', 'item_id'])
  })
}

/**
 * MariaDB DDL is not transactional, so every statement tolerates a
 * half-finished rollback and can be run again. Foreign keys go before the
 * indexes they use.
 */
export async function down(knex: Knex): Promise<void> {
  const run = (sql: string) => knex.raw(sql)

  await run('ALTER TABLE `cart_item` DROP INDEX IF EXISTS `cart_item_cart_id_item_id_unique`')
  await run('ALTER TABLE `cart` DROP INDEX IF EXISTS `cart_last_updated_index`')
  await run('ALTER TABLE `cart` MODIFY `sum` int(11) NOT NULL')

  await run('ALTER TABLE `order_item` DROP COLUMN IF EXISTS `price`')
  await run('ALTER TABLE `order` DROP INDEX IF EXISTS `order_number_unique`')
  for (const column of [
    'name', 'family_name', 'city', 'phone', 'e_mail', 'delivery_point_code',
    'delivery_cost', 'payment_state', 'comment', 'consent_at', 'consent_version'
  ]) {
    await run(`ALTER TABLE \`order\` DROP COLUMN IF EXISTS \`${column}\``)
  }

  await run('ALTER TABLE `client` DROP COLUMN IF EXISTS `delivery_point_code`')
  await run('ALTER TABLE `client` ADD COLUMN IF NOT EXISTS `comment` varchar(255) NULL')

  await run('ALTER TABLE `user` DROP FOREIGN KEY IF EXISTS `user_role_id_foreign`')
  await run('ALTER TABLE `user` DROP COLUMN IF EXISTS `role_id`')

  await run('ALTER TABLE `seller` DROP COLUMN IF EXISTS `name`')

  await run('ALTER TABLE `shops` DROP COLUMN IF EXISTS `working_hours`')
  await run('ALTER TABLE `shops` ADD COLUMN IF NOT EXISTS `start_working` timestamp NULL')
  await run('ALTER TABLE `shops` ADD COLUMN IF NOT EXISTS `end_working` timestamp NULL')

  await run('ALTER TABLE `shop_photo` DROP FOREIGN KEY IF EXISTS `shop_photo_shop_id_foreign`')
  await run('ALTER TABLE `shop_photo` DROP INDEX IF EXISTS `shop_photo_shop_id_index`')
  await run('ALTER TABLE `shop_photo` DROP COLUMN IF EXISTS `shop_id`')

  await run('ALTER TABLE `price` DROP FOREIGN KEY IF EXISTS `price_product_id_foreign`')
  await run('ALTER TABLE `price` DROP INDEX IF EXISTS `price_product_id_price_date_index`')
  await run('ALTER TABLE `price` DROP COLUMN IF EXISTS `product_id`')
  await run('ALTER TABLE `price` ADD COLUMN IF NOT EXISTS `item` tinyint(1) NULL DEFAULT 1')

  await run('ALTER TABLE `item` DROP FOREIGN KEY IF EXISTS `item_product_id_foreign`')
  await run('ALTER TABLE `item` DROP INDEX IF EXISTS `item_product_id_main_color_second_color_unique`')
  await run('ALTER TABLE `item` DROP COLUMN IF EXISTS `product_id`')

  // order_state rows added by up()
  await knex('order_state').whereIn('name', ORDER_STATES.map((s) => s.name)).delete()

  for (const table of [
    'publication', 'setting', 'seo', 'page_block', 'page', 'role_permission', 'role', 'product'
  ]) {
    await knex.schema.dropTableIfExists(table)
  }
}
