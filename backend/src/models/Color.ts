import { BaseSettings } from './BaseSettings'
import { ColorRow } from '../types/color.types'

/**
 * Color validation and business logic for Knex Color model
 */
export class Color extends BaseSettings {
  private id: number
  private name: string
  private code: string
  private hex: string | null
  private deleted: boolean

  constructor(data: ColorRow) {
    super()
    this.id = data.id
    this.name = data.name
    this.code = data.code
    this.hex = data.hex
    this.deleted = data.deleted
  }

  /**
   * Validate code: exactly 2 digits
   */
  private validateCode(code?: string): boolean {
    if (!code || code.trim() === '') {
      return false
    }
    
    const codeRegex = /^\d{2}$/
    return codeRegex.test(code)
  }

  /**
   * Validate hex: empty or 3 or 6 characters
   */
  private validateHex(hex?: string | null): boolean {
    if (!hex || hex.trim() === '') {
      return true // Empty is valid
    }
    
    const hexRegex = /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/
    return hexRegex.test(hex)
    }

  /**
   * Validate name, code and hex
   */
  public validate(data: { name?: string; code?: string; hex?: string | null }): boolean {
    return this.validateName(data.name) && this.validateCode(data.code) && this.validateHex(data.hex)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Цвет`
  }
}
