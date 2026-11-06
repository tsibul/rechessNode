/** Normalize a Russian phone to +7XXXXXXXXXX; null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+7${digits}`
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return `+7${digits.slice(1)}`
  return null
}
