import { db } from '../db'
import { ItemPhoto } from '../models/ItemPhoto'
import { ItemPhotoRow } from '../types/itemPhoto.types'

export class ItemPhotoRepository {
  static async findById(id: number): Promise<ItemPhoto | null> {
    const row = await db('item_photo').where({ id }).first()
    return row ? new ItemPhoto(row) : null
  }

  static async findByItemId(itemId: number): Promise<ItemPhoto[]> {
    const rows = await db('item_photo').where({ item_id: itemId, deleted: false })
    return rows.map(row => new ItemPhoto(row))
  }

  static async findAll(): Promise<ItemPhoto[]> {
    const rows = await db('item_photo')
    return rows.map(row => new ItemPhoto(row))
  }

  static async findActive(): Promise<ItemPhoto[]> {
    const rows = await db('item_photo').where({ deleted: false })
    return rows.map(row => new ItemPhoto(row))
  }

  static async findByName(name: string): Promise<ItemPhoto[]> {
    const rows = await db('item_photo').where('name', 'like', `%${name}%`)
    return rows.map(row => new ItemPhoto(row))
  }

  static async findActiveByName(name: string): Promise<ItemPhoto[]> {
    const rows = await db('item_photo').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new ItemPhoto(row))
  }
} 