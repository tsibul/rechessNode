import { db } from '../db'
import { Order } from '../models/Order'
import { OrderRow } from '../types/order.types'

export class OrderRepository {
  static async findById(id: number): Promise<Order | null> {
    const row = await db('order').where({ id }).first()
    return row ? new Order(row) : null
  }

  static async findByClientId(clientId: number): Promise<Order[]> {
    const rows = await db('order').where({ client_id: clientId, deleted: false })
    return rows.map(row => new Order(row))
  }

  static async findByOrderStateId(orderStateId: number): Promise<Order[]> {
    const rows = await db('order').where({ order_state_id: orderStateId, deleted: false })
    return rows.map(row => new Order(row))
  }

  static async findAll(): Promise<Order[]> {
    const rows = await db('order')
    return rows.map(row => new Order(row))
  }

  static async findActive(): Promise<Order[]> {
    const rows = await db('order').where({ deleted: false })
    return rows.map(row => new Order(row))
  }

  static async findByName(name: string): Promise<Order[]> {
    const rows = await db('order').where('name', 'like', `%${name}%`)
    return rows.map(row => new Order(row))
  }

  static async findActiveByName(name: string): Promise<Order[]> {
    const rows = await db('order').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new Order(row))
  }
} 