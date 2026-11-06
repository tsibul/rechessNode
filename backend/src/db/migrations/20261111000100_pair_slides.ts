/**
 * Top-view and board slides of the seven colour pairs (photos from the customer's Drive folder «цвет»).
 * The files are in frontend/public/media (`top-N`, `board-N`, N is the order of the pair in the seed);
 * they are copied to the upload folder when it is reachable. A pair is found by the codes of its colours,
 * a slide that already exists in the pair (same slot) is left alone, so the CMS values win.
 */
import fs from 'fs'
import path from 'path'
import type { Knex } from 'knex'
import { uploadDir } from '../../routes/cms/uploads'

const MEDIA = path.resolve(__dirname, '../../../../frontend/public/media')
const NAMES: Record<string, string> = {
  '01': 'пепельный', '02': 'антрацитовый', '04': 'терракотовый', '10': 'бирюзовый',
  '09': 'изумрудный', '03': 'охристый', '19': 'карминовый', '06': 'аквамариновый'
}
const PAIRS: Array<[string, string]> = [['01', '02'], ['01', '04'], ['01', '10'], ['09', '02'], ['03', '19'], ['01', '19'], ['01', '06']]
const SLOTS = [['top', 'фигуры сверху', 20], ['board', 'доска с фигурами', 30]] as const

export async function up(knex: Knex): Promise<void> {
  for (const [i, [m, s]] of PAIRS.entries()) {
    const item = await knex('item as i')
      .join('color as mc', 'mc.id', 'i.main_color').join('color as sc', 'sc.id', 'i.second_color')
      .where({ 'mc.code': m, 'sc.code': s }).andWhere((q) => q.where('i.deleted', false).orWhereNull('i.deleted'))
      .orderBy('i.id').first('i.id')
    if (!item) continue
    for (const [slot, label, priority] of SLOTS) {
      const exists = await knex('item_photo').where({ item_id: item.id, slot }).first('id')
      if (exists) continue
      const base = `${slot}-${i + 1}`
      for (const ext of ['jpg', 'webp', 'avif']) {
        const from = path.join(MEDIA, `${base}.${ext}`)
        try {
          fs.mkdirSync(uploadDir(), { recursive: true })
          fs.copyFileSync(from, path.join(uploadDir(), `${base}.${ext}`))
        } catch { /* media folder is not next to the backend: the files are uploaded by hand */ }
      }
      await knex('item_photo').insert({
        name: `${NAMES[m]} / ${NAMES[s]}, ${label}`, priority, photo: `${base}.jpg`, slot, item_id: item.id
      })
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('item_photo').whereIn('photo', PAIRS.flatMap((_, i) => [`top-${i + 1}.jpg`, `board-${i + 1}.jpg`])).delete()
}
