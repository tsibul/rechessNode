import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })

import { ColorRepository } from '../repositories/ColorRepository'
import { ItemRepository } from '../repositories/ItemRepository'
import { ClientRepository } from '../repositories/ClientRepository'
import { CartRepository } from '../repositories/CartRepository'
import { CartItemRepository } from '../repositories/CartItemRepository'
import { OrderRepository } from '../repositories/OrderRepository'
import { OrderItemRepository } from '../repositories/OrderItemRepository'
import { OrderStateRepository } from '../repositories/OrderStateRepository'
import { PriceRepository } from '../repositories/PriceRepository'
import { SellerRepository } from '../repositories/SellerRepository'
import { ShopsRepository } from '../repositories/ShopsRepository'
import { UserRepository } from '../repositories/UserRepository'
import { IndexPhotoRepository } from '../repositories/IndexPhotoRepository'
import { ShopPhotoRepository } from '../repositories/ShopPhotoRepository'
import { ItemPhotoRepository } from '../repositories/ItemPhotoRepository'
import { db } from '../db'

describe('Repository Tests - Get One Record from Each Table', () => {
  describe('ColorRepository', () => {
    it('should get one color by id', async () => {
      const color = await ColorRepository.findById(1)
      expect(color).toBeDefined()
      if (color) {
        expect(color.getVerboseName()).toBe('Цвет')
      }
    })
  })

  describe('ItemRepository', () => {
    it('should get one item by id', async () => {
      const item = await ItemRepository.findById(1)
      expect(item).toBeDefined()
      if (item) {
        expect(item.getVerboseName()).toBe('Предмет')
      }
    })
  })

  describe('ClientRepository', () => {
    it('should get one client by id', async () => {
      const client = await ClientRepository.findById(1)
      expect(client).toBeDefined()
      if (client) {
        expect(client.getVerboseName()).toBe('Клиент')
      }
    })
  })

  describe('CartRepository', () => {
    it('should get one cart by id', async () => {
      const cart = await CartRepository.findById(1)
      expect(cart).toBeDefined()
      if (cart) {
        expect(cart.getVerboseName()).toBe('Корзина')
      }
    })
  })

  describe('CartItemRepository', () => {
    it('should get one cart item by id', async () => {
      const cartItem = await CartItemRepository.findById(1)
      expect(cartItem).toBeDefined()
      if (cartItem) {
        expect(cartItem.getVerboseName()).toBe('Позиция корзины')
      }
    })
  })

  describe('OrderRepository', () => {
    it('should get one order by id', async () => {
      const order = await OrderRepository.findById(1)
      expect(order).toBeDefined()
      if (order) {
        expect(order.getVerboseName()).toBe('Заказ')
      }
    })
  })

  describe('OrderItemRepository', () => {
    it('should get one order item by id', async () => {
      const orderItem = await OrderItemRepository.findById(1)
      expect(orderItem).toBeDefined()
      if (orderItem) {
        expect(orderItem.getVerboseName()).toBe('Позиция заказа')
      }
    })
  })

  describe('OrderStateRepository', () => {
    it('should get one order state by id', async () => {
      const orderState = await OrderStateRepository.findById(1)
      expect(orderState).toBeDefined()
      if (orderState) {
        expect(orderState.getVerboseName()).toBe('Статус заказа')
      }
    })
  })

  describe('PriceRepository', () => {
    it('should get one price by id', async () => {
      const price = await PriceRepository.findById(1)
      expect(price).toBeDefined()
      if (price) {
        expect(price.getVerboseName()).toBe('Цена')
      }
    })
  })

  describe('SellerRepository', () => {
    it('should get one seller by id', async () => {
      const seller = await SellerRepository.findById(1)
      expect(seller).toBeDefined()
      if (seller) {
        expect(seller.getVerboseName()).toBe('Продавец')
      }
    })
  })

  describe('ShopsRepository', () => {
    it('should get one shop by id', async () => {
      const shop = await ShopsRepository.findById(1)
      expect(shop).toBeDefined()
      if (shop) {
        expect(shop.getVerboseName()).toBe('Магазин')
      }
    })
  })

  // describe('UserRepository', () => {
  //   it('should get one user by id', async () => {
  //     const user = await UserRepository.findById(1)
  //     expect(user).toBeDefined()
  //     if (user) {
  //       expect(user.getVerboseName()).toBe('Администратор')
  //     }
  //   })
  // })
  //
  // describe('IndexPhotoRepository', () => {
  //   it('should get one index photo by id', async () => {
  //     const indexPhoto = await IndexPhotoRepository.findById(1)
  //     expect(indexPhoto).toBeDefined()
  //     if (indexPhoto) {
  //       expect(indexPhoto.getVerboseName()).toBe('Фото главной страницы')
  //     }
  //   })
  // })
  //
  // describe('ShopPhotoRepository', () => {
  //   it('should get one shop photo by id', async () => {
  //     const shopPhoto = await ShopPhotoRepository.findById(1)
  //     expect(shopPhoto).toBeDefined()
  //     if (shopPhoto) {
  //       expect(shopPhoto.getVerboseName()).toBe('Фото магазина')
  //     }
  //   })
  // })

  // describe('ItemPhotoRepository', () => {
  //   it('should get one item photo by id', async () => {
  //     const itemPhoto = await ItemPhotoRepository.findById(1)
  //     expect(itemPhoto).toBeDefined()
  //     if (itemPhoto) {
  //       expect(itemPhoto.getVerboseName()).toBe('Фото продукта')
  //     }
  //   })
  // })
})

// Cleanup after all tests
afterAll(async () => {
  await db.destroy()
})
