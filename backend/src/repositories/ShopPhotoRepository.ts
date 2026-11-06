import { db } from '../db'
import { ShopPhoto } from '../models/ShopPhoto'
import { ShopPhotoRow } from '../types/shopPhoto.types'

export class ShopPhotoRepository {
  static async findById(id: number): Promise<ShopPhoto | null> {
    const row = await db('shop_photo').where({ id }).first()
    return row ? new ShopPhoto(row) : null
  }

  static async findAll(): Promise<ShopPhoto[]> {
    const rows = await db('shop_photo')
    return rows.map(row => new ShopPhoto(row))
  }

  static async findActive(): Promise<ShopPhoto[]> {
    const rows = await db('shop_photo').where({ deleted: false })
    return rows.map(row => new ShopPhoto(row))
  }

  static async findByName(name: string): Promise<ShopPhoto[]> {
    const rows = await db('shop_photo').where('name', 'like', `%${name}%`)
    return rows.map(row => new ShopPhoto(row))
  }

  static async findActiveByName(name: string): Promise<ShopPhoto[]> {
    const rows = await db('shop_photo').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new ShopPhoto(row))
  }
} 