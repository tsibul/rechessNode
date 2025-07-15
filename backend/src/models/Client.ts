import { BaseSettings } from './BaseSettings'
import { ClientRow } from '../types/client.types'

/**
 * Client validation and business logic for Knex Client model
 */
export class Client extends BaseSettings {
  private id: number
  private tokenHash: string
  private name: string | null
  private family_name: string | null
  private city: string | null
  private phone: string | null
  private e_mail: string | null
  private address_delivery: boolean
  private delivery_address: string | null
  private comment: string | null
  private ip_address: string | null
  private deleted: boolean

  public constructor(data: ClientRow) {
    super()
    this.id = data.id
    this.tokenHash = data.tokenHash
    this.name = data.name
    this.family_name = data.family_name
    this.city = data.city
    this.phone = data.phone
    this.e_mail = data.e_mail
    this.address_delivery = data.adress_delivery
    this.delivery_address = data.delivery_address
    this.comment = data.comment
    this.ip_address = data.ip_address
    this.deleted = data.deleted
  }

  /**
   * Validate name and family_name: empty or Russian letters, numbers, spaces, dashes
   */
  private validateRussianName(name?: string | null): boolean {
    if (!name || name.trim() === '') {
      return true // Empty is valid
    }

    const nameRegex = /^[а-яёА-ЯЁa-zA-Z0-9\s\-_]+$/
    return nameRegex.test(name)
  }

  /**
   * Validate city and address: empty or letters, numbers, spaces, dashes, dots, commas, quotes
   */
  private validateAddress(address?: string | null): boolean {
    if (!address || address.trim() === '') {
      return true // Empty is valid
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
   * Validate email: empty or standard email format
   */
  private validateEmail(email?: string | null): boolean {
    if (!email || email.trim() === '') {
      return true // Empty is valid
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate all client data
   */
  public validate(data: {
    name?: string | null;
    family_name?: string | null;
    city?: string | null;
    phone?: string | null;
    e_mail?: string | null;
    delivery_address?: string | null
  }): boolean {
    return this.validateRussianName(data.name) &&
           this.validateRussianName(data.family_name) &&
           this.validateAddress(data.city) &&
           this.validatePhone(data.phone) &&
           this.validateEmail(data.e_mail) &&
           this.validateAddress(data.delivery_address)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Клиент`
  }

  /**
   * Get client ID
   */
  public getId(): number {
    return this.id
  }

  /**
   * Get client name
   */
  public getName(): string | null {
    return this.name
  }
}
