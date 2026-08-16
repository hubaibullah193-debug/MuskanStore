import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage and display featured products', async ({ page }) => {
    await page.goto('/');

    // Check page title or header
    await expect(page).toHaveTitle(/mstore|Store/i);

    // Featured products section should be visible
    const featuredSection = page.locator('text=Featured Products');
    await expect(featuredSection).toBeVisible();

    // Should show multiple product cards
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should navigate to product detail page', async ({ page }) => {
    await page.goto('/');

    // Click first product card
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();

    // Should navigate to product page
    await expect(page).toHaveURL(/\/products\//);

    // Product details should be visible
    const productName = page.locator('h1');
    await expect(productName).toBeVisible();
  });

  test('should display product variants on detail page', async ({ page }) => {
    await page.goto('/');

    // Navigate to first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Variants section should exist
    const variantsSection = page.locator('text=Select Options');
    await expect(variantsSection).toBeVisible();

    // Should have variant selectors
    const variantSelects = page.locator('select, [role="listbox"]');
    const count = await variantSelects.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/');

    // Navigate to first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Select a variant if available
    const variantSelect = page.locator('select').first();
    const options = page.locator('select option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await variantSelect.selectOption({ index: 1 });
    }

    // Set quantity
    const quantityInput = page.locator('input[type="number"]');
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('2');
    }

    // Click add to cart button
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Cart should show item count
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).toContainText('1');
  });

  test('should navigate to cart and view items', async ({ page }) => {
    await page.goto('/');

    // Add product to cart
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Navigate to cart
    const cartLink = page.locator('[data-testid="cart-link"]');
    await cartLink.click();

    // Should be on cart page
    await expect(page).toHaveURL(/\/cart/);

    // Should see cart items
    const cartItems = page.locator('[data-testid="cart-item"]');
    const itemCount = await cartItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('should remove item from cart', async ({ page }) => {
    await page.goto('/');

    // Add product to cart
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Go to cart
    const cartLink = page.locator('[data-testid="cart-link"]');
    await cartLink.click();

    // Remove item
    const removeButton = page.locator('button:has-text("Remove")').first();
    await removeButton.click();

    // Cart should be empty
    const emptyMessage = page.locator('text=Your cart is empty');
    await expect(emptyMessage).toBeVisible();
  });
});
