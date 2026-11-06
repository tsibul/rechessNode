import { db } from '../db'
import { Price } from '../models/Price'
import { PriceRow } from '../types/price.types'

export class PriceRepository {
  static async findById(id: number): Promise<Price | null> {
    const row = await db('price').where({ id }).first()
    return row ? new Price(row) : null
  }

  static async findAll(): Promise<Price[]> {
    const rows = await db('price')
    return rows.map(row => new Price(row))
  }

  static async findActive(): Promise<Price[]> {
    const rows = await db('price').where({ deleted: false })
    return rows.map(row => new Price(row))
  }

  static async findByName(name: string): Promise<Price[]> {
    const rows = await db('price').where('name', 'like', `%${name}%`)
    return rows.map(row => new Price(row))
  }

  static async findActiveByName(name: string): Promise<Price[]> {
    const rows = await db('price').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new Price(row))
  }
} 