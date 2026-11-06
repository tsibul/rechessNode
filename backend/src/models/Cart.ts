import { BaseSettings } from './BaseSettings'
import { CartRow } from '../types/cart.types'

/**
 * Cart validation and business logic for Knex Cart model
 */
export class Cart extends BaseSettings {
  private id: number
  private last_updated: Date
  private client_id: number
  private ordered: Date | null
  private sum: number
  private deleted: boolean

  public constructor(data: CartRow) {
    super()
    this.id = data.id
    this.last_updated = data.last_updated
    this.client_id = data.client_id
    this.ordered = data.ordered
    this.sum = data.sum
    this.deleted = data.deleted
  }

  /**
   * Validate client_id: not null and number greater than 0
   */
  private validateClientId(client_id?: number): boolean {
    if (client_id === null || client_id === undefined) {
      return false
    }
    return typeof client_id === 'number' && client_id > 0
  }

  /**
   * Validate sum: not null and number greater than 0
   */
  private validateSum(sum?: number): boolean {
    if (sum === null || sum === undefined) {
      return false
    }
    return typeof sum === 'number' && sum > 0
  }

  /**
   * Validate all cart data
   */
  public validate(data: { 
    client_id?: number; 
    sum?: number 
  }): boolean {
    return this.validateClientId(data.client_id) && this.validateSum(data.sum)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Корзина`
  }
} 