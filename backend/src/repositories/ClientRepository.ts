import { db } from '../db'
import { Client } from '../models/Client'
import { ClientRow } from '../types/client.types'
import crypto from 'crypto'

export class ClientRepository {
  static async findById(id: number): Promise<Client | null> {
    const row = await db('client').where({ id }).first()
    return row ? new Client(row) : null
  }

  static async findByTokenHash(tokenHash: string): Promise<Client | null> {
    const row = await db('client').where({ tokenHash }).first()
    return row ? new Client(row) : null
  }

  static async findAll(): Promise<Client[]> {
    const rows = await db('client')
    return rows.map(row => new Client(row))
  }

  static async findActive(): Promise<Client[]> {
    const rows = await db('client').where({ deleted: false })
    return rows.map(row => new Client(row))
  }

  static async findByName(name: string): Promise<Client[]> {
    const rows = await db('client').where('name', 'like', `%${name}%`)
    return rows.map(row => new Client(row))
  }

  static async findActiveByName(name: string): Promise<Client[]> {
    const rows = await db('client').where({ deleted: false }).where('name', 'like', `%${name}%`)
    return rows.map(row => new Client(row))
  }

  /**
   * Create new client with token hash
   */
  static async create(tokenHash: string, ipAddress: string): Promise<Client> {
    const now = new Date()
    const guestName = `Гость${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    
    const [id] = await db('client').insert({
      tokenHash,
      name: guestName,
      ip_address: ipAddress,
      deleted: false
    })

    const row = await db('client').where({ id }).first()
    return new Client(row)
  }

  /**
   * Update client IP address
   */
  static async updateIpAddress(tokenHash: string, ipAddress: string): Promise<Client | null> {
    const updated = await db('client')
      .where({ tokenHash })
      .update({ ip_address: ipAddress })
    
    if (updated > 0) {
      const row = await db('client').where({ tokenHash }).first()
      return row ? new Client(row) : null
    }
    
    return null
  }

  /**
   * Generate unique token hash
   */
  static generateTokenHash(): string {
    return crypto.randomBytes(32).toString('hex')
  }
} 