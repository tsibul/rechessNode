import { test, expect } from '@playwright/test'

test.describe('Example E2E Tests', () => {
  test('should navigate to home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ReChess/)
  })

  test('should navigate to shop page', async ({ page }) => {
    await page.goto('/shop')
    await expect(page.getByRole('heading', { name: /Shop/i })).toBeVisible()
  })

  test('should add item to cart', async ({ page }) => {
    // Navigate to shop
    await page.goto('/shop')

    // Find and click add to cart button
    const addToCartButton = page.getByRole('button', { name: /Add to cart/i })
    await addToCartButton.first().click()

    // Check if cart badge updates
    const cartBadge = page.getByTestId('cart-badge')
    await expect(cartBadge).toBeVisible()
    await expect(cartBadge).toHaveText('1')
  })
}) 