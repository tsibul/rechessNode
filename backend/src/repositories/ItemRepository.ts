import { db } from '../db'
import { Item } from '../models/Item'
import { ItemRow } from '../types/item.types'

export class ItemRepository {
  static async findById(id: number): Promise<Item | null> {
    const row = await db('item').where({ id }).first()
    return row ? new Item(row) : null
  }

  static async findAll(): Promise<Item[]> {
    const rows = await db('item')
    return rows.map(row => new Item(row))
  }

  static async findActive(): Promise<Item[]> {
    const rows = await db('item').where({ deleted: false })
    return rows.map(row => new Item(row))
  }

  static async findByName(name: string): Promise<Item[]> {
    const rows = await db('item').where('name', 'like', `%${name}%`)
    return rows.map(row => new Item(row))
  }

  static async findActiveByName(name: string): Promise<Item[]> {
    const rows = await db('item').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new Item(row))
  }
} 