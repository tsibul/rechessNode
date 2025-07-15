import { BaseSettings } from './BaseSettings'
import { UserRow } from '../types/user.types'

/**
 * User validation and business logic for Knex User model (CMS administrators)
 */
export class User extends BaseSettings {
  private id: number
  private name: string
  private login: string
  private password: string
  private hashToken: string | null
  private deleted: boolean

  public constructor(data: UserRow) {
    super()
    this.id = data.id
    this.name = data.name
    this.login = data.login
    this.password = data.password
    this.hashToken = data.hashToken
    this.deleted = data.deleted
  }

  /**
   * Validate name: not null and not empty
   */
  private validateName(name?: string): boolean {
    if (!name || name.trim() === '') {
      return false
    }
    return name.length > 0
  }

  /**
   * Validate login: not null, not empty, alphanumeric and underscore only
   */
  private validateLogin(login?: string): boolean {
    if (!login || login.trim() === '') {
      return false
    }
    
    const loginRegex = /^[a-zA-Z0-9_]+$/
    return loginRegex.test(login) && login.length >= 3
  }

  /**
   * Validate password: not null, not empty, minimum length
   */
  private validatePassword(password?: string): boolean {
    if (!password || password.trim() === '') {
      return false
    }
    return password.length >= 6
  }

  /**
   * Validate all user data
   */
  public validate(data: { 
    name?: string; 
    login?: string; 
    password?: string 
  }): boolean {
    return this.validateName(data.name) && 
           this.validateLogin(data.login) && 
           this.validatePassword(data.password)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Администратор`
  }
} 