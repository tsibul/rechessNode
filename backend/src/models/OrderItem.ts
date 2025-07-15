import { BaseSettings } from './BaseSettings'
import { OrderItemRow } from '../types/orderItem.types'

/**
 * OrderItem validation and business logic for Knex OrderItem model
 */
export class OrderItem extends BaseSettings {
  private id: number
  private item_id: number
  private quantity: number
  private order_id: number
  private deleted: boolean

  public constructor(data: OrderItemRow) {
    super()
    this.id = data.id
    this.item_id = data.item_id
    this.quantity = data.quantity
    this.order_id = data.order_id
    this.deleted = data.deleted
  }

  /**
   * Validate item_id: not null and number greater than 0
   */
  private validateItemId(item_id?: number): boolean {
    if (item_id === null || item_id === undefined) {
      return false
    }
    return typeof item_id === 'number' && item_id > 0
  }

  /**
   * Validate quantity: not null and number greater than 0
   */
  private validateQuantity(quantity?: number): boolean {
    if (quantity === null || quantity === undefined) {
      return false
    }
    return typeof quantity === 'number' && quantity > 0
  }

  /**
   * Validate order_id: not null and number greater than 0
   */
  private validateOrderId(order_id?: number): boolean {
    if (order_id === null || order_id === undefined) {
      return false
    }
    return typeof order_id === 'number' && order_id > 0
  }

  /**
   * Validate all order item data
   */
  public validate(data: { 
    item_id?: number; 
    quantity?: number; 
    order_id?: number 
  }): boolean {
    return this.validateItemId(data.item_id) && 
           this.validateQuantity(data.quantity) && 
           this.validateOrderId(data.order_id)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Позиция заказа`
  }
} 