import { BaseSettings } from './BaseSettings'
import { OrderRow } from '../types/order.types'
import { validateAddress } from '../utils/validation'

/**
 * Order validation and business logic for Knex Order model
 */
export class Order extends BaseSettings {
  private id: number
  private number: number
  private date: Date
  private client_id: number
  private sum: number
  private delivery_address: string
  private address_delivery: boolean
  private order_state_id: number
  private delivery_reference: string | null
  private last_updated: Date
  private updated_by: number | null
  private deleted: boolean

  public constructor(data: OrderRow) {
    super()
    this.id = data.id
    this.number = data.number
    this.date = data.date
    this.client_id = data.client_id
    this.sum = data.sum
    this.delivery_address = data.delivery_address
    this.address_delivery = data.address_delivery
    this.order_state_id = data.order_state_id
    this.delivery_reference = data.delivery_reference
    this.last_updated = data.last_updated
    this.updated_by = data.updated_by
    this.deleted = data.deleted
  }

  /**
   * Validate number: not null and number greater than 0
   */
  private validateNumber(number?: number): boolean {
    if (number === null || number === undefined) {
      return false
    }
    return typeof number === 'number' && number > 0
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
   * Validate client_id: not null and number greater than 0
   */
  private validateClientId(client_id?: number): boolean {
    if (client_id === null || client_id === undefined) {
      return false
    }
    return typeof client_id === 'number' && client_id > 0
  }

  /**
   * Validate order_state_id: not null and number greater than 0
   */
  private validateOrderStateId(order_state_id?: number): boolean {
    if (order_state_id === null || order_state_id === undefined) {
      return false
    }
    return typeof order_state_id === 'number' && order_state_id > 0
  }

  /**
   * Validate updated_by: null or number greater than 0
   */
  private validateUpdatedBy(updated_by?: number | null): boolean {
    if (updated_by === null || updated_by === undefined) {
      return true // Null is valid
    }
    return typeof updated_by === 'number' && updated_by > 0
  }

  /**
   * Validate all order data
   */
  public validate(data: { 
    number?: number; 
    client_id?: number; 
    sum?: number; 
    delivery_address?: string; 
    order_state_id?: number;
    updated_by?: number | null
  }): boolean {
    return this.validateNumber(data.number) && 
           this.validateClientId(data.client_id) && 
           this.validateSum(data.sum) && 
           validateAddress(data.delivery_address) && 
           this.validateOrderStateId(data.order_state_id) &&
           this.validateUpdatedBy(data.updated_by)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Заказ`
  }
} 