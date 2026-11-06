/**
 * Slide slot of a pair photo: `side` (figures from the side), `top` (figures from above),
 * `board` (the board set up in this colour pair). Existing photos are the side view.
 */
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_photo', (table) => {
    table.string('slot', 16).notNullable().defaultTo('side')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('item_photo', (table) => {
    table.dropColumn('slot')
  })
}
