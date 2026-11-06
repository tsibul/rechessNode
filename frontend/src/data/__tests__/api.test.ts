import { describe, expect, it } from 'vitest'
import { mapSite } from '../api'
import { devContent } from '../fixtures'

describe('mapSite', () => {
  const empty: any = { settings: {}, pages: [], products: [], shops: [], index_photos: [], seller: null }

  it('falls back to the fixtures when the API is empty', () => {
    const c = mapSite(empty)
    expect(c.product).toEqual(devContent.product)
  })

  it('takes the product, item ids and the price from the API', () => {
    const c = mapSite({
      ...empty,
      products: [{
        id: 5, name: 'Набор', description: 'd', price: 4200,
        items: [{ id: 9, name: 'п', main_color: { name: 'Белый', hex: 'ffffff' }, second_color: { name: 'Чёрный', hex: '#000000' }, photos: [] }]
      }]
    })
    expect(c.product.id).toBe(5)
    expect(c.product.price).toBe(4200)
    expect(c.product.pairs[0].id).toBe(9)
    expect(c.product.pairs[0].main.hex).toBe('#ffffff')
  })

  it('skips products without a price', () => {
    const c = mapSite({ ...empty, products: [{ id: 5, name: 'x', description: null, price: null, items: [] }] })
    expect(c.product).toEqual(devContent.product)
  })
})
