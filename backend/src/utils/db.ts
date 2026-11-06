import type { Knex } from 'knex'

/** Where-clause fragment: row is not soft-deleted (deleted is 0 or NULL). */
export function notDeleted<T extends Knex.QueryBuilder>(qb: T, column = 'deleted'): T {
  return qb.where((b) => b.where(column, 0).orWhereNull(column)) as T
}
