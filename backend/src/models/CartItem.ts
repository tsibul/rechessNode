import { BaseSettings } from './BaseSettings'
import { CartItemRow } from '../types/cartItem.types'

/**
 * CartItem validation and business logic for Knex CartItem model
 */
export class CartItem extends BaseSettings {
  private id: number
  private cart_id: number
  private item_id: number
  private quantity: number
  private deleted: boolean

  public constructor(data: CartItemRow) {
    super()
    this.id = data.id
    this.cart_id = data.cart_id
    this.item_id = data.item_id
    this.quantity = data.quantity
    this.deleted = data.deleted
  }

  /**
   * Validate cart_id: not null and number greater than 0
   */
  private validateCartId(cart_id?: number): boolean {
    if (cart_id === null || cart_id === undefined) {
      return false
    }
    return typeof cart_id === 'number' && cart_id > 0
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
   * Validate all cart item data
   */
  public validate(data: { 
    cart_id?: number; 
    item_id?: number; 
    quantity?: number 
  }): boolean {
    return this.validateCartId(data.cart_id) && 
           this.validateItemId(data.item_id) && 
           this.validateQuantity(data.quantity)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Позиция корзины`
  }
} 