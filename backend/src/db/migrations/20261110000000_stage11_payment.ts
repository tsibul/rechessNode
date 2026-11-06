/**
 * Stage 11: payment bookkeeping in the order (provider, payment reference, time of payment).
 * `payment_state` gets two more values in the code (`pending`, `failed`); the column is a string.
 */
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('order', (table) => {
    table.string('payment_provider', 32).nullable()
    table.string('payment_ref', 64).nullable().unique()
    table.dateTime('paid_at').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('order', (table) => {
    table.dropColumn('paid_at')
    table.dropColumn('payment_ref')
    table.dropColumn('payment_provider')
  })
}
