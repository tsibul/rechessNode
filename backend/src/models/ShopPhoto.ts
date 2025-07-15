import { BaseSettings } from './BaseSettings'
import { ShopPhotoRow } from '../types/shopPhoto.types'

/**
 * ShopPhoto validation and business logic for Knex ShopPhoto model
 */
export class ShopPhoto extends BaseSettings {
  private id: number
  private name: string
  private priority: number
  private photo: string
  private deleted: boolean

  public constructor(data: ShopPhotoRow) {
    super()
    this.id = data.id
    this.name = data.name
    this.priority = data.priority
    this.photo = data.photo
    this.deleted = data.deleted
  }

  /**
   * Validate priority: not null and number
   */
  private validatePriority(priority?: number): boolean {
    if (priority === null || priority === undefined) {
      return false
    }
    return typeof priority === 'number' && priority > 0
  }

  /**
   * Validate photo: not null and filename with extension
   */
  private validatePhoto(photo?: string): boolean {
    if (!photo || photo.trim() === '') {
      return false
    }
    
    const photoRegex = /^[a-zA-Z0-9_-]+\.(png|jpg|webp)$/
    return photoRegex.test(photo)
  }

  /**
   * Validate name, priority and photo
   */
  public validate(data: { name?: string; priority?: number; photo?: string }): boolean {
    return this.validateName(data.name) && this.validatePriority(data.priority) && this.validatePhoto(data.photo)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Фото магазина`
  }
}
 