import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create color table
  await knex.schema.createTable('color', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.string('code', 2).notNullable().unique()
    table.string('hex', 6).nullable()
    table.boolean('deleted').defaultTo(false)
  })

  // Create item table
  await knex.schema.createTable('item', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.integer('main_color').unsigned().notNullable()
    table.integer('second_color').unsigned().notNullable()
    table.boolean('deleted').defaultTo(false)

    table.foreign('main_color').references('id').inTable('color')
    table.foreign('second_color').references('id').inTable('color')
  })

  // Create index_photo table
  await knex.schema.createTable('index_photo', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.smallint('priority').notNullable()
    table.string('photo', 255).notNullable()
    table.boolean('deleted').defaultTo(false)
  })

  // Create shop_photo table
  await knex.schema.createTable('shop_photo', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.smallint('priority').notNullable()
    table.string('photo', 255).notNullable()
    table.boolean('deleted').defaultTo(false)
  })

  // Create item_photo table
  await knex.schema.createTable('item_photo', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.smallint('priority').notNullable()
    table.string('photo', 255).notNullable()
    table.integer('item_id').unsigned().notNullable()
    table.boolean('deleted').defaultTo(false)

    table.foreign('item_id').references('id').inTable('item')
  })

  // Create client table
  await knex.schema.createTable('client', (table) => {
    table.increments('id')
    table.string('tokenHash', 255).notNullable().unique()
    table.string('name', 255).nullable()
    table.string('family_name', 255).nullable()
    table.string('city', 255).nullable()
    table.string('phone', 20).nullable()
    table.string('e_mail', 255).nullable()
    table.boolean('address_delivery').defaultTo(false)
    table.string('delivery_address', 500).nullable()
    table.string('comment', 255).nullable()
    table.string('ip_address', 45).nullable()
    table.boolean('deleted').defaultTo(false)
  })

  // Create price table
  await knex.schema.createTable('price', (table) => {
    table.increments('id')
    table.integer('price').notNullable()
    table.boolean('item').defaultTo(true)
    table.timestamp('price_date').defaultTo(knex.fn.now())
    table.boolean('deleted').defaultTo(false)
  })

  // Create shops table
  await knex.schema.createTable('shops', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.string('address', 500).notNullable()
    table.timestamp('start_working').nullable()
    table.timestamp('end_working').nullable()
    table.string('phone', 20).nullable()
    table.string('web_site', 255).nullable()
    table.boolean('deleted').defaultTo(false)
  })

  // Create order_state table
  await knex.schema.createTable('order_state', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.smallint('priority').notNullable()
    table.boolean('deleted').defaultTo(false)
  })

  // Create user table
  await knex.schema.createTable('user', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    table.string('login', 255).notNullable().unique()
    table.string('password', 255).notNullable()
    table.string('hashToken', 255).nullable().unique()
    table.boolean('deleted').defaultTo(false)
  })

  // Create seller table
  await knex.schema.createTable('seller', (table) => {
    table.increments('id')
    table.string('ogrn', 13).notNullable()
    table.string('inn', 12).notNullable()
    table.string('kpp', 9).notNullable()
    table.string('address', 500).notNullable()
    table.string('phone', 20).notNullable()
    table.boolean('deleted').defaultTo(false)
  })

  // Create order table
  await knex.schema.createTable('order', (table) => {
    table.increments('id')
    table.integer('number').notNullable()
    table.timestamp('date').defaultTo(knex.fn.now())
    table.integer('client_id').unsigned().notNullable()
    table.integer('sum').notNullable()
    table.string('delivery_address', 500).notNullable()
    table.boolean('address_delivery').defaultTo(false)
    table.integer('order_state_id').unsigned().notNullable()
    table.string('delivery_reference', 255).nullable()
    table.timestamp('last_updated').defaultTo(knex.fn.now())
    table.integer('updated_by').unsigned().nullable()
    table.boolean('deleted').defaultTo(false)

    table.foreign('client_id').references('id').inTable('client')
    table.foreign('order_state_id').references('id').inTable('order_state')
    table.foreign('updated_by').references('id').inTable('user')

    table.index('client_id')
    table.index('order_state_id')
  })

  // Create order_item table
  await knex.schema.createTable('order_item', (table) => {
    table.increments('id')
    table.integer('item_id').unsigned().notNullable()
    table.integer('quantity').notNullable()
    table.integer('order_id').unsigned().notNullable()
    table.boolean('deleted').defaultTo(false)

    table.foreign('item_id').references('id').inTable('item')
    table.foreign('order_id').references('id').inTable('order')

    table.index('order_id')
  })

  // Create cart table
  await knex.schema.createTable('cart', (table) => {
    table.increments('id')
    table.timestamp('last_updated').defaultTo(knex.fn.now())
    table.integer('client_id').unsigned().notNullable()
    table.timestamp('ordered').nullable()
    table.integer('sum').notNullable()
    table.boolean('deleted').defaultTo(false)

    table.foreign('client_id').references('id').inTable('client')

    table.index('client_id')
  })

  // Create cart_item table
  await knex.schema.createTable('cart_item', (table) => {
    table.increments('id')
    table.integer('cart_id').unsigned().notNullable()
    table.integer('item_id').unsigned().notNullable()
    table.integer('quantity').notNullable()
    table.boolean('deleted').defaultTo(false)

    table.foreign('cart_id').references('id').inTable('cart')
    table.foreign('item_id').references('id').inTable('item')

    table.index('cart_id')
  })
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('cart_item')
  await knex.schema.dropTableIfExists('cart')
  await knex.schema.dropTableIfExists('order_item')
  await knex.schema.dropTableIfExists('order')
  await knex.schema.dropTableIfExists('seller')
  await knex.schema.dropTableIfExists('user')
  await knex.schema.dropTableIfExists('order_state')
  await knex.schema.dropTableIfExists('shops')
  await knex.schema.dropTableIfExists('price')
  await knex.schema.dropTableIfExists('client')
  await knex.schema.dropTableIfExists('item_photo')
  await knex.schema.dropTableIfExists('shop_photo')
  await knex.schema.dropTableIfExists('index_photo')
  await knex.schema.dropTableIfExists('item')
  await knex.schema.dropTableIfExists('color')
}
