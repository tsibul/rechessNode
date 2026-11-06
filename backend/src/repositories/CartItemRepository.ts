import { db } from '../db'
import { CartItem } from '../models/CartItem'
import { CartItemRow } from '../types/cartItem.types'

export class CartItemRepository {
  static async findById(id: number): Promise<CartItem | null> {
    const row = await db('cart_item').where({ id }).first()
    return row ? new CartItem(row) : null
  }

  static async findByCartId(cartId: number): Promise<CartItem[]> {
    const rows = await db('cart_item').where({ cart_id: cartId, deleted: false })
    return rows.map(row => new CartItem(row))
  }

  static async findAll(): Promise<CartItem[]> {
    const rows = await db('cart_item')
    return rows.map(row => new CartItem(row))
  }

  static async findActive(): Promise<CartItem[]> {
    const rows = await db('cart_item').where({ deleted: false })
    return rows.map(row => new CartItem(row))
  }

  static async findByName(name: string): Promise<CartItem[]> {
    const rows = await db('cart_item').where('name', 'like', `%${name}%`)
    return rows.map(row => new CartItem(row))
  }

  static async findActiveByName(name: string): Promise<CartItem[]> {
    const rows = await db('cart_item').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new CartItem(row))
  }
} 