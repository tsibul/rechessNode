import type { Knex } from 'knex'
import { COOKIE_POLICY, PERSONAL_DATA_POLICY, PRIVACY_POLICY } from '../legal_texts_2026'

/**
 * The customer accepted the proposals for the policies (docs/POLICY_PROPOSALS.md):
 * - the cookie policy (column 2 of the legal page) lists the real cookies and the accept/decline choice;
 * - the privacy policy (column 3) gets the legal basis, retention, third parties, storage place, rights and mailings;
 * - /personal-data holds the personal data policy only (no copy of the cookie policy);
 * - the typo «влаение» in the company details is fixed.
 * The texts are replaced as they are in the database: they were edited through the CMS only for the company name and the address.
 * There is no way back to the old texts: `down` does nothing.
 */
export async function up(knex: Knex): Promise<void> {
  const privacy = await knex('page').where({ slug: 'privacy' }).first('id')
  if (privacy) {
    const blocks = await knex('page_block').where({ page_id: privacy.id }).select('id', 'content')
    for (const b of blocks) {
      const content = typeof b.content === 'string' ? JSON.parse(b.content) : b.content
      const cols = content?.columns
      if (!Array.isArray(cols) || cols.length < 3) continue
      cols[0] = String(cols[0]).split('влаение').join('владение')
      cols[1] = COOKIE_POLICY
      cols[2] = PRIVACY_POLICY
      await knex('page_block').where({ id: b.id }).update({ content: JSON.stringify(content) })
    }
  }
  const personal = await knex('page').where({ slug: 'personal-data' }).first('id')
  if (personal) {
    const blocks = await knex('page_block').where({ page_id: personal.id }).select('id', 'content')
    for (const b of blocks) {
      const content = typeof b.content === 'string' ? JSON.parse(b.content) : b.content
      if (typeof content?.html !== 'string') continue
      content.html = PERSONAL_DATA_POLICY
      await knex('page_block').where({ id: b.id }).update({ content: JSON.stringify(content) })
    }
  }
}

export async function down(): Promise<void> {
  // The old texts are kept in git history only.
}
