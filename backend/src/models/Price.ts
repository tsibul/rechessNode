import { BaseSettings } from './BaseSettings'
import { PriceRow } from '../types/price.types'

/**
 * Price validation and business logic for Knex Price model
 */
export class Price extends BaseSettings {
  private id: number
  private price: number
  private item: boolean
  private price_date: Date
  private deleted: boolean

  public constructor(data: PriceRow) {
    super()
    this.id = data.id
    this.price = data.price
    this.item = data.item
    this.price_date = data.price_date
    this.deleted = data.deleted
  }

  /**
   * Validate price: integer greater than 0
   */
  private validatePrice(price?: number): boolean {
    if (price === null || price === undefined) {
      return false
    }
    return typeof price === 'number' && Number.isInteger(price) && price > 0
  }

  /**
   * Validate price data
   */
  public validate(data: { price?: number }): boolean {
    return this.validatePrice(data.price)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Цена`
  }
} 