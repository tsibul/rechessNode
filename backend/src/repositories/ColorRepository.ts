import { db } from '../db'
import { Color } from '../models/Color'
import { ColorRow } from '../types/color.types'

export class ColorRepository {
  static async findById(id: number): Promise<Color | null> {
    const row = await db('color').where({ id }).first()
    return row ? new Color(row) : null
  }

  static async findByCode(code: string): Promise<Color | null> {
    const row = await db('color').where({ code }).first()
    return row ? new Color(row) : null
  }

  static async findAll(): Promise<Color[]> {
    const rows = await db('color')
    return rows.map(row => new Color(row))
  }

  static async findActive(): Promise<Color[]> {
    const rows = await db('color').where({ deleted: false })
    return rows.map(row => new Color(row))
  }

  static async findByName(name: string): Promise<Color[]> {
    const rows = await db('color').where('name', 'like', `%${name}%`)
    return rows.map(row => new Color(row))
  }

  static async findActiveByName(name: string): Promise<Color[]> {
    const rows = await db('color').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new Color(row))
  }
} 