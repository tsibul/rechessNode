import { db } from '../db'
import { OrderState } from '../models/OrderState'
import { OrderStateRow } from '../types/orderState.types'

export class OrderStateRepository {
  static async findById(id: number): Promise<OrderState | null> {
    const row = await db('order_state').where({ id }).first()
    return row ? new OrderState(row) : null
  }

  static async findAll(): Promise<OrderState[]> {
    const rows = await db('order_state')
    return rows.map(row => new OrderState(row))
  }

  static async findActive(): Promise<OrderState[]> {
    const rows = await db('order_state').where({ deleted: false })
    return rows.map(row => new OrderState(row))
  }

  static async findByName(name: string): Promise<OrderState[]> {
    const rows = await db('order_state').where('name', 'like', `%${name}%`)
    return rows.map(row => new OrderState(row))
  }

  static async findActiveByName(name: string): Promise<OrderState[]> {
    const rows = await db('order_state').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new OrderState(row))
  }
} 