/** Product name for lists and mails: the first line of the catalog name (the second line describes the set). */
export const shortProductName = (name: string | null | undefined): string =>
  (name ?? '').split(/\r?\n/)[0].replace(/\s+/g, ' ').trim()
