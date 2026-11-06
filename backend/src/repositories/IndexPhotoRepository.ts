import { db } from '../db'
import { IndexPhoto } from '../models/IndexPhoto'
import { IndexPhotoRow } from '../types/indexPhoto.types'

export class IndexPhotoRepository {
  static async findById(id: number): Promise<IndexPhoto | null> {
    const row = await db('index_photo').where({ id }).first()
    return row ? new IndexPhoto(row) : null
  }

  static async findAll(): Promise<IndexPhoto[]> {
    const rows = await db('index_photo')
    return rows.map(row => new IndexPhoto(row))
  }

  static async findActive(): Promise<IndexPhoto[]> {
    const rows = await db('index_photo').where({ deleted: false })
    return rows.map(row => new IndexPhoto(row))
  }

  static async findByName(name: string): Promise<IndexPhoto[]> {
    const rows = await db('index_photo').where('name', 'like', `%${name}%`)
    return rows.map(row => new IndexPhoto(row))
  }

  static async findActiveByName(name: string): Promise<IndexPhoto[]> {
    const rows = await db('index_photo').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new IndexPhoto(row))
  }
} 