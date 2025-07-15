import {BaseSettings} from './BaseSettings'
import {ItemRow} from '../types/item.types'

/**
 * Item validation and business logic for Knex Item model
 */
export class Item extends BaseSettings {
  private id: number
  private name: string
  private main_color: number
  private second_color: number
  private deleted: boolean

  constructor(data: ItemRow) {
    super()
    this.id = data.id
    this.name = data.name
    this.main_color = data.main_color
    this.second_color = data.second_color
    this.deleted = data.deleted
  }

  /**
   * Validate main_color and second_color are different
   */
  public validate(data: { main_color?: number; second_color?: number }): boolean {
    if (!data.main_color || !data.second_color) {
      return false
    }
    return data.main_color !== data.second_color
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Предмет`
  }
}
 