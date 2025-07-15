import { BaseSettings } from './BaseSettings'
import { ShopsRow } from '../types/shops.types'

/**
 * Shops validation and business logic for Knex Shops model
 */
export class Shops extends BaseSettings {
  private id: number
  private name: string
  private address: string
  private start_working: Date | null
  private end_working: Date | null
  private phone: string | null
  private web_site: string | null
  private deleted: boolean

  public constructor(data: ShopsRow) {
    super()
    this.id = data.id
    this.name = data.name
    this.address = data.address
    this.start_working = data.start_working
    this.end_working = data.end_working
    this.phone = data.phone
    this.web_site = data.web_site
    this.deleted = data.deleted
  }

  /**
   * Validate address: letters, numbers, spaces, dashes, dots, commas, quotes
   */
  private validateAddress(address?: string): boolean {
    if (!address || address.trim() === '') {
      return false
    }
    
    const addressRegex = /^[а-яёА-ЯЁa-zA-Z0-9\s\-.,""'']+$/
    return addressRegex.test(address)
  }

  /**
   * Validate phone: empty or + digits spaces parentheses
   */
  private validatePhone(phone?: string | null): boolean {
    if (!phone || phone.trim() === '') {
      return true // Empty is valid
    }
    
    const phoneRegex = /^\+?[0-9\s\(\)]+$/
    return phoneRegex.test(phone)
  }

  /**
   * Validate website: empty or valid URL format
   */
  private validateWebsite(website?: string | null): boolean {
    if (!website || website.trim() === '') {
      return true // Empty is valid
    }
    
    const websiteRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/
    return websiteRegex.test(website)
  }

  /**
   * Validate all shops data
   */
  public validate(data: { 
    name?: string; 
    address?: string; 
    phone?: string | null; 
    web_site?: string | null 
  }): boolean {
    return this.validateName(data.name) && 
           this.validateAddress(data.address) && 
           this.validatePhone(data.phone) && 
           this.validateWebsite(data.web_site)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Магазин`
  }
} 