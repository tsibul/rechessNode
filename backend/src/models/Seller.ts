import { BaseSettings } from './BaseSettings'
import { SellerRow } from '../types/seller.types'

/**
 * Seller validation and business logic for Knex Seller model
 */
export class Seller extends BaseSettings {
  private id: number
  private ogrn: string
  private inn: string
  private kpp: string
  private address: string
  private phone: string
  private deleted: boolean

  public constructor(data: SellerRow) {
    super()
    this.id = data.id
    this.ogrn = data.ogrn
    this.inn = data.inn
    this.kpp = data.kpp
    this.address = data.address
    this.phone = data.phone
    this.deleted = data.deleted
  }

  /**
   * Validate OGRN: exactly 13 digits
   */
  private validateOgrn(ogrn?: string): boolean {
    if (!ogrn || ogrn.trim() === '') {
      return false
    }
    return /^\d{13}$/.test(ogrn)
  }

  /**
   * Validate INN: exactly 10 or 12 digits
   */
  private validateInn(inn?: string): boolean {
    if (!inn || inn.trim() === '') {
      return false
    }
    return /^\d{10}(\d{2})?$/.test(inn)
  }

  /**
   * Validate KPP: exactly 9 digits
   */
  private validateKpp(kpp?: string): boolean {
    if (!kpp || kpp.trim() === '') {
      return false
    }
    return /^\d{9}$/.test(kpp)
  }

  /**
   * Validate address: not null and not empty
   */
  private validateAddress(address?: string): boolean {
    if (!address || address.trim() === '') {
      return false
    }
    return address.length > 0
  }

  /**
   * Validate phone: + digits spaces parentheses
   */
  private validatePhone(phone?: string): boolean {
    if (!phone || phone.trim() === '') {
      return false
    }
    return /^\+?[\d\s\(\)]+$/.test(phone)
  }

  /**
   * Validate all fields
   */
  public validate(): boolean {
    return (
      this.validateOgrn(this.ogrn) &&
      this.validateInn(this.inn) &&
      this.validateKpp(this.kpp) &&
      this.validateAddress(this.address) &&
      this.validatePhone(this.phone)
    )
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Продавец`
  }

  // Getters
  public getId(): number {
    return this.id
  }

  public getOgrn(): string {
    return this.ogrn
  }

  public getInn(): string {
    return this.inn
  }

  public getKpp(): string {
    return this.kpp
  }

  public getAddress(): string {
    return this.address
  }

  public getPhone(): string {
    return this.phone
  }

  public isDeleted(): boolean {
    return this.deleted
  }
} 