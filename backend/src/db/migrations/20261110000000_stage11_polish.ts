/**
 * Stage 11: polish after acceptance.
 * - the page `personal-data` is now the "Политика обработки персональных данных" (Figma frame 2431:650);
 *   the name and SEO defaults are replaced only where they still hold the old draft values;
 * - colour hex values are replaced by values measured on the Figma photos (frame 2724:75),
 *   only where the row still holds the value that was picked by eye.
 * The page text lives in frontend/src/data/fixtures.ts and is edited in the CMS.
 */
import type { Knex } from 'knex'

const OLD_NAME = 'Обработка персональных данных'
const NEW_NAME = 'Политика обработки персональных данных'
const OLD_SEO_TITLE = 'Согласие на обработку персональных данных — reChess'
const NEW_SEO = {
  title: 'Политика обработки персональных данных — reChess',
  description: 'Политика использования файлов cookie и политика обработки персональных данных сайта reChess.'
}

// code, old hex (by eye), new hex (Figma photos)
const HEX: Array<[string, string, string]> = [
  ['01', 'A9ABAA', 'A5AAA9'], ['02', '2E2F31', '535454'], ['04', 'C4527A', 'CA5C78'], ['10', '1E9C8E', '46988F'],
  ['09', '3DC27E', '64BE86'], ['03', 'D4B63A', 'BBAB50'], ['19', 'B8393B', 'B45656'], ['06', '2A97C2', '5D9DB8']
]

export async function up(knex: Knex): Promise<void> {
  const page = await knex('page').where({ slug: 'personal-data' }).first('id')
  if (page) {
    await knex('page').where({ id: page.id, name: OLD_NAME }).update({ name: NEW_NAME })
    await knex('seo').where({ page_id: page.id, title: OLD_SEO_TITLE }).update(NEW_SEO)
  }
  for (const [code, oldHex, newHex] of HEX) {
    await knex('color').where({ code, hex: oldHex }).update({ hex: newHex })
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const [code, oldHex, newHex] of HEX) {
    await knex('color').where({ code, hex: newHex }).update({ hex: oldHex })
  }
  const page = await knex('page').where({ slug: 'personal-data' }).first('id')
  if (page) {
    await knex('page').where({ id: page.id, name: NEW_NAME }).update({ name: OLD_NAME })
    await knex('seo').where({ page_id: page.id, title: NEW_SEO.title }).update({ title: OLD_SEO_TITLE })
  }
}
