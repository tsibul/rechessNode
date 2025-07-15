import { BaseSettings } from './BaseSettings'
import { OrderStateRow } from '../types/orderState.types'

/**
 * OrderState validation and business logic for Knex OrderState model
 */
export class OrderState extends BaseSettings {
  private id: number
  private name: string
  private priority: number
  private deleted: boolean

  public constructor(data: OrderStateRow) {
    super()
    this.id = data.id
    this.name = data.name
    this.priority = data.priority
    this.deleted = data.deleted
  }

  /**
   * Validate priority: not null and number greater than 0
   */
  private validatePriority(priority?: number): boolean {
    if (priority === null || priority === undefined) {
      return false
    }
    return typeof priority === 'number' && priority > 0
  }

  /**
   * Validate name and priority
   */
  public validate(data: { name?: string; priority?: number }): boolean {
    return this.validateName(data.name) && this.validatePriority(data.priority)
  }

  /**
   * Return human-readable name
   */
  public getVerboseName(): string {
    return `Статус заказа`
  }
} 