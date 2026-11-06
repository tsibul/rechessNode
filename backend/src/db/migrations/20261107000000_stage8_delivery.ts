import type { Knex } from 'knex'

/**
 * Stage 8: delivery tariffs, product weight and size, delivery and mail marks in the order,
 * default mail texts and the tracking link setting. See docs/DATA_MODEL.md, "Этап 8".
 */

// Placeholder tariffs so the table is not empty; the manager replaces them in the CMS.
// name, address_delivery, city, weight_to (g), price, priority
const TARIFFS: Array<[string, boolean, string | null, number | null, number, number]> = [
  ['Москва, до двери', true, 'Москва', null, 500, 10],
  ['Москва, пункт выдачи', false, 'Москва', null, 300, 10],
  ['Россия, до двери', true, null, null, 800, 100],
  ['Россия, пункт выдачи', false, null, null, 500, 100]
]

const MAIL_DEFAULTS: Record<string, string> = {
  'mail.from_name': 'reChess',
  'mail.order.subject': 'Заказ № {{number}} принят',
  'mail.order.body':
    '<p>Здравствуйте, {{name}}!</p><p>Спасибо за заказ № {{number}}. Мы получили его и свяжемся с вами, если понадобятся уточнения.</p>'
    + '{{items}}<p>Доставка: {{delivery}}.<br>Итого к оплате: <b>{{sum}}</b>.</p>'
    + '<p>Когда заказ будет передан в доставку, мы пришлём номер для отслеживания.</p>',
  'mail.track.subject': 'Заказ № {{number}} передан в доставку',
  'mail.track.body':
    '<p>Здравствуйте, {{name}}!</p><p>Заказ № {{number}} передан в СДЭК. Номер для отслеживания: <b>{{track}}</b>.</p>'
    + '<p>{{track_link}}</p>'
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('delivery_tariff', (table) => {
    table.increments('id')
    table.string('name', 255).notNullable()
    // true: to the door, false: to a pickup point
    table.boolean('address_delivery').notNullable()
    // empty: any city (the fallback tariff)
    table.string('city', 255).nullable()
    // upper bound of the order weight, grams; empty: no limit
    table.integer('weight_to').nullable()
    table.integer('price').notNullable()
    table.smallint('priority').notNullable().defaultTo(100)
    table.boolean('deleted').notNullable().defaultTo(false)
  })
  await knex('delivery_tariff').insert(
    TARIFFS.map(([name, address_delivery, city, weight_to, price, priority]) => (
      { name, address_delivery, city, weight_to, price, priority }
    ))
  )

  await knex.schema.alterTable('product', (table) => {
    table.integer('weight_g').nullable()
    table.integer('length_mm').nullable()
    table.integer('width_mm').nullable()
    table.integer('height_mm').nullable()
  })

  await knex.schema.alterTable('order', (table) => {
    table.integer('weight_g').nullable()
    table.integer('delivery_tariff_id').unsigned().nullable()
    table.timestamp('confirmation_sent_at').nullable()
    table.string('confirmation_error', 500).nullable()
    table.timestamp('track_sent_at').nullable()
    table.string('track_sent_ref', 255).nullable()
    table.string('track_error', 500).nullable()
    table.foreign('delivery_tariff_id').references('id').inTable('delivery_tariff')
  })

  await knex('setting').insert({
    code: 'delivery.tracking_url', name: 'Ссылка отслеживания СДЭК ({{track}} — номер)', type: 'text',
    value: 'https://www.cdek.ru/ru/tracking?order_id={{track}}', group_name: 'Доставка', priority: 10
  })
  for (const [code, value] of Object.entries(MAIL_DEFAULTS)) {
    await knex('setting').where({ code }).whereNull('value').update({ value })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('setting').where({ code: 'delivery.tracking_url' }).delete()
  await knex.raw('ALTER TABLE `order` DROP FOREIGN KEY IF EXISTS `order_delivery_tariff_id_foreign`')
  for (const c of ['weight_g', 'delivery_tariff_id', 'confirmation_sent_at', 'confirmation_error', 'track_sent_at', 'track_sent_ref', 'track_error']) {
    await knex.raw(`ALTER TABLE \`order\` DROP COLUMN IF EXISTS \`${c}\``)
  }
  for (const c of ['weight_g', 'length_mm', 'width_mm', 'height_mm']) {
    await knex.raw(`ALTER TABLE \`product\` DROP COLUMN IF EXISTS \`${c}\``)
  }
  await knex.schema.dropTableIfExists('delivery_tariff')
}
