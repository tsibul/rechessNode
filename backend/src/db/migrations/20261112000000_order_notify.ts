import type { Knex } from 'knex'

/**
 * Manager notification about a new order and the buyer-facing order text.
 * - order.manager_sent_at / manager_error: result of the mail to the managers (shown in the CMS);
 * - settings: recipients, subject and body of that mail, and the text shown after ordering
 *   while payment on the site is a stub. All of them are edited in the CMS, "Настройки".
 */

const SETTINGS: Array<[string, string, string, string, number, string]> = [
  ['mail.manager.to', 'Письмо менеджерам о новом заказе: адреса (через запятую)', 'text', 'Письма', 60, ''],
  ['mail.manager.subject', 'Письмо менеджерам: тема', 'text', 'Письма', 70, 'Новый заказ № {{number}} на {{sum}}'],
  ['mail.manager.body', 'Письмо менеджерам: текст', 'html', 'Письма', 80,
    '<p>Новый заказ № {{number}} от {{date}}.</p>{{items}}'
    + '<p>Итого: <b>{{sum}}</b>. Оплата: {{payment}}.</p>'
    + '<p>Покупатель: {{name}}<br>Телефон: {{phone}}<br>Почта: {{email}}</p>'
    + '<p>Доставка: {{delivery}}.</p><p>Комментарий покупателя: {{comment}}</p>'
    + '<p><a href="{{cms_link}}" style="color:#000000;font-weight:bold">Открыть заказ в CMS</a></p>'],
  ['shop.order_stub_text', 'Текст при заказе, пока оплата на сайте не подключена', 'text', 'Магазин', 200,
    'Оплата на сайте пока не подключена. Мы свяжемся с вами по телефону или почте, уточним детали заказа и расскажем, как оплатить.']
]

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('order', (table) => {
    table.timestamp('manager_sent_at').nullable()
    table.string('manager_error', 500).nullable()
  })
  for (const [code, name, type, group_name, priority, value] of SETTINGS) {
    if (!(await knex('setting').where({ code }).first('id'))) {
      await knex('setting').insert({ code, name, type, group_name, priority, value: value || null })
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('setting').whereIn('code', SETTINGS.map((s) => s[0])).delete()
  for (const c of ['manager_sent_at', 'manager_error']) {
    await knex.raw(`ALTER TABLE \`order\` DROP COLUMN IF EXISTS \`${c}\``)
  }
}
