import { db } from '../db'
import { Shops } from '../models/Shops'
import { ShopsRow } from '../types/shops.types'

export class ShopsRepository {
  static async findById(id: number): Promise<Shops | null> {
    const row = await db('shops').where({ id }).first()
    return row ? new Shops(row) : null
  }

  static async findAll(): Promise<Shops[]> {
    const rows = await db('shops')
    return rows.map(row => new Shops(row))
  }

  static async findActive(): Promise<Shops[]> {
    const rows = await db('shops').where({ deleted: false })
    return rows.map(row => new Shops(row))
  }

  static async findByName(name: string): Promise<Shops[]> {
    const rows = await db('shops').where('name', 'like', `%${name}%`)
    return rows.map(row => new Shops(row))
  }

  static async findActiveByName(name: string): Promise<Shops[]> {
    const rows = await db('shops').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new Shops(row))
  }
} 