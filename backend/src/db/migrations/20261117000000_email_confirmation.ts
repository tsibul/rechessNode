import type { Knex } from 'knex'

/**
 * Confirmation of the buyer's e-mail.
 * - order.email_confirm_status: 'pending' (waits for the link), 'confirmed', 'expired' (cancelled, not confirmed in time).
 *   Existing orders get 'confirmed': nothing changes for them.
 * - order.confirm_hash: SHA-256 of the one-time token from the link (the token itself is never stored);
 *   confirm_expires_at: end of the 24 hours; confirm_sent_at/confirm_error/confirm_sends: the mail with the link;
 *   email_confirmed_at/email_confirmed_by: when and how ('link', 'known' = address confirmed within 30 days, 'manager').
 * - confirmed_email: addresses confirmed through a link, valid for 30 days.
 * - settings: texts of the mail and of the pages, edited in the CMS.
 */

const SETTINGS: Array<[string, string, string, string, number, string]> = [
  ['mail.confirm.subject', 'Письмо с подтверждением заказа: тема', 'text', 'Письма', 90, 'Подтвердите заказ № {{number}}'],
  ['mail.confirm.body', 'Письмо с подтверждением заказа: текст', 'html', 'Письма', 100,
    '<p>Здравствуйте, {{name}}!</p><p>Вы оформили заказ № {{number}} на {{sum}}. Чтобы мы приняли его в работу, подтвердите адрес почты.</p>'
    + '<p>{{confirm_link}}</p><p>Ссылка действует 24 часа. Если вы не подтвердите заказ, он будет отменён. Если вы ничего не заказывали, просто проигнорируйте это письмо.</p>'],
  ['shop.confirm.pending', 'Страница заказа: ждём подтверждения (используйте {{email}})', 'text', 'Магазин', 210,
    'Мы отправили письмо на {{email}}. Подтвердите заказ по ссылке из письма — до этого оплата и обработка заказа недоступны. Ссылка действует 24 часа, потом заказ будет отменён.'],
  ['shop.confirm.expired', 'Страница заказа: заказ не подтверждён вовремя', 'text', 'Магазин', 220,
    'Заказ отменён: адрес почты не был подтверждён в течение 24 часов. Оформите заказ заново.'],
  ['shop.confirm.done_title', 'Страница подтверждения: заголовок', 'text', 'Магазин', 230, 'Заказ подтверждён'],
  ['shop.confirm.done_text', 'Страница подтверждения: текст', 'text', 'Магазин', 240,
    'Спасибо! Мы отправили письмо с номером заказа. Вернитесь на страницу заказа, чтобы перейти к оплате.'],
  ['shop.confirm.invalid_title', 'Страница подтверждения: ссылка недействительна, заголовок', 'text', 'Магазин', 250, 'Ссылка недействительна'],
  ['shop.confirm.invalid_text', 'Страница подтверждения: ссылка недействительна, текст', 'text', 'Магазин', 260,
    'Ссылка устарела или уже использована. Откройте страницу заказа в браузере, где он оформлен, и запросите письмо ещё раз.']
]

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('order', (table) => {
    table.string('email_confirm_status', 16).notNullable().defaultTo('confirmed')
    table.string('confirm_hash', 64).nullable()
    table.timestamp('confirm_expires_at').nullable()
    table.timestamp('confirm_sent_at').nullable()
    table.string('confirm_error', 500).nullable()
    table.integer('confirm_sends').notNullable().defaultTo(0)
    table.timestamp('email_confirmed_at').nullable()
    table.string('email_confirmed_by', 16).nullable()
    table.index('confirm_hash')
    table.index(['email_confirm_status', 'confirm_expires_at'])
  })
  await knex.schema.createTable('confirmed_email', (table) => {
    table.increments('id')
    table.string('e_mail', 255).notNullable().unique()
    table.timestamp('confirmed_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('expires_at').notNullable()
  })
  for (const [code, name, type, group_name, priority, value] of SETTINGS) {
    if (!(await knex('setting').where({ code }).first('id'))) {
      await knex('setting').insert({ code, name, type, group_name, priority, value })
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('setting').whereIn('code', SETTINGS.map((s) => s[0])).delete()
  await knex.schema.dropTableIfExists('confirmed_email')
  for (const c of ['email_confirm_status', 'confirm_hash', 'confirm_expires_at', 'confirm_sent_at', 'confirm_error', 'confirm_sends', 'email_confirmed_at', 'email_confirmed_by']) {
    await knex.raw(`ALTER TABLE \`order\` DROP COLUMN IF EXISTS \`${c}\``)
  }
}
