import { db } from '../db'
import { User } from '../models/User'
import { UserRow } from '../types/user.types'

export class UserRepository {
  static async findById(id: number): Promise<User | null> {
    const row = await db('user').where({ id }).first()
    return row ? new User(row) : null
  }

  static async findByLogin(login: string): Promise<User | null> {
    const row = await db('user').where({ login }).first()
    return row ? new User(row) : null
  }

  static async findByHashToken(hashToken: string): Promise<User | null> {
    const row = await db('user').where({ hashToken }).first()
    return row ? new User(row) : null
  }

  static async findAll(): Promise<User[]> {
    const rows = await db('user')
    return rows.map(row => new User(row))
  }

  static async findActive(): Promise<User[]> {
    const rows = await db('user').where({ deleted: false })
    return rows.map(row => new User(row))
  }

  static async findByName(name: string): Promise<User[]> {
    const rows = await db('user').where('name', 'like', `%${name}%`)
    return rows.map(row => new User(row))
  }

  static async findActiveByName(name: string): Promise<User[]> {
    const rows = await db('user').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new User(row))
  }
} 