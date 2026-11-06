import { db } from '../db'
import { Cart } from '../models/Cart'
import { CartRow } from '../types/cart.types'

export class CartRepository {
  static async findById(id: number): Promise<Cart | null> {
    const row = await db('cart').where({ id }).first()
    return row ? new Cart(row) : null
  }

  static async findByClientId(clientId: number): Promise<Cart[]> {
    const rows = await db('cart').where({ client_id: clientId, deleted: false })
    return rows.map(row => new Cart(row))
  }

  static async findAll(): Promise<Cart[]> {
    const rows = await db('cart')
    return rows.map(row => new Cart(row))
  }

  static async findActive(): Promise<Cart[]> {
    const rows = await db('cart').where({ deleted: false })
    return rows.map(row => new Cart(row))
  }

  static async findByName(name: string): Promise<Cart[]> {
    const rows = await db('cart').where('name', 'like', `%${name}%`)
    return rows.map(row => new Cart(row))
  }

  static async findActiveByName(name: string): Promise<Cart[]> {
    const rows = await db('cart').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new Cart(row))
  }
} 