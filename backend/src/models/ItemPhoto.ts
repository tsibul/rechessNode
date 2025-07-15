import { BaseSettings } from './BaseSettings'
import { ItemPhotoRow } from '../types/itemPhoto.types'

/**
 * ItemPhoto validation and business logic for Knex ItemPhoto model
 */
export class ItemPhoto extends BaseSettings {
  private id: number
  private name: string
  private priority: number
  private photo: string
  private item_id: number
  private deleted: boolean

  public constructor(data: ItemPhotoRow) {
    super()
    this.id = data.id
    this.name = data.name
    this.priority = data.priority
    this.photo = data.photo
    this.item_id = data.item_id
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
   * Validate item_id: not null and number
   */
  private validateItemId(item_id?: number): boolean {
    if (item_id === null || item_id === undefined) {
      return false
    }
    return typeof item_id === 'number' && item_id > 0
  }

  /**
   * Validate name, priority, photo and item_id
   */
  public validate(data: { name?: string; priority?: number; photo?: string; item_id?: number }): boolean {
    return this.validateName(data.name) && this.validatePriority(data.priority) && this.validatePhoto(data.photo) && this.validateItemId(data.item_id)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Фото продукта`
  }
} 