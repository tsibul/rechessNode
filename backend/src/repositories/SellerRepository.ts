import { db } from '../db'
import { Seller } from '../models/Seller'
import { SellerRow } from '../types/seller.types'

export class SellerRepository {
  static async findById(id: number): Promise<Seller | null> {
    const row = await db('seller').where({ id }).first()
    return row ? new Seller(row) : null
  }

  static async findAll(): Promise<Seller[]> {
    const rows = await db('seller')
    return rows.map(row => new Seller(row))
  }

  static async findActive(): Promise<Seller[]> {
    const rows = await db('seller').where({ deleted: false })
    return rows.map(row => new Seller(row))
  }

  static async findByName(name: string): Promise<Seller[]> {
    const rows = await db('seller').where('name', 'like', `%${name}%`)
    return rows.map(row => new Seller(row))
  }

  static async findActiveByName(name: string): Promise<Seller[]> {
    const rows = await db('seller').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new Seller(row))
  }
} 