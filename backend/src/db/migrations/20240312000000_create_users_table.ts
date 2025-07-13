import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    // Основные поля
    table.increments('id').primary()
    table.string('email', 255).notNullable().unique()
    table.string('name', 255).notNullable()
    
    // Пароль не храним, так как используем токены
    table.string('token_hash', 255).nullable()
    
    // Связи
    table.integer('cart_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('carts')
      .onDelete('SET NULL')
    
    // Настройки пользователя
    table.jsonb('preferences').nullable().defaultTo('{}')
    table.boolean('is_active').notNullable().defaultTo(true)
    table.string('language', 10).notNullable().defaultTo('en')
    
    // Адрес доставки
    table.string('shipping_address').nullable()
    table.string('shipping_city').nullable()
    table.string('shipping_country').nullable()
    table.string('shipping_postal_code', 20).nullable()
    
    // Метаданные
    table.timestamp('last_login_at').nullable()
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
    
    // Индексы
    table.index(['email'], 'users_email_index')
    table.index(['name'], 'users_name_index')
    table.index(['is_active'], 'users_is_active_index')
  })

  // Создаем триггер для автоматического обновления updated_at
  await knex.raw(`
    CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    SET NEW.updated_at = CURRENT_TIMESTAMP
  `)
}

export async function down(knex: Knex): Promise<void> {
  // Удаляем триггер
  await knex.raw('DROP TRIGGER IF EXISTS update_users_updated_at')
  
  // Удаляем таблицу
  await knex.schema.dropTableIfExists('users')
} 