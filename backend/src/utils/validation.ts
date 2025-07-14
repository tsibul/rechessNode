/**
 * Validation utilities for reuse across models
 */

/**
 * Validate address: letters, numbers, spaces, dashes, dots, commas, quotes
 */
export function validateAddress(address?: string): boolean {
  if (!address || address.trim() === '') {
    return false
  }
  
  const addressRegex = /^[а-яёА-ЯЁa-zA-Z0-9\s\-.,""'']+$/
  return addressRegex.test(address)
} 