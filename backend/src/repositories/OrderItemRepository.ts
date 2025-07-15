import { db } from '../db'
import { OrderItem } from '../models/OrderItem'
import { OrderItemRow } from '../types/orderItem.types'

export class OrderItemRepository {
  static async findById(id: number): Promise<OrderItem | null> {
    const row = await db('order_item').where({ id }).first()
    return row ? new OrderItem(row) : null
  }

  static async findByOrderId(orderId: number): Promise<OrderItem[]> {
    const rows = await db('order_item').where({ order_id: orderId, deleted: false })
    return rows.map(row => new OrderItem(row))
  }

  static async findAll(): Promise<OrderItem[]> {
    const rows = await db('order_item')
    return rows.map(row => new OrderItem(row))
  }

  static async findActive(): Promise<OrderItem[]> {
    const rows = await db('order_item').where({ deleted: false })
    return rows.map(row => new OrderItem(row))
  }

  static async findByName(name: string): Promise<OrderItem[]> {
    const rows = await db('order_item').where('name', 'like', `%${name}%`)
    return rows.map(row => new OrderItem(row))
  }

  static async findActiveByName(name: string): Promise<OrderItem[]> {
    const rows = await db('order_item').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new OrderItem(row))
  }
} 