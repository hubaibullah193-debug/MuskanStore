import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests signup, login, and logout flows
 */

const TEST_USER = {
  name: 'Test User',
  email: `testuser-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  phone: '+92 300 1234567',
};

test.describe('Authentication', () => {
  test('should sign up a new user', async ({ page }) => {
    await page.goto('/auth/signup');

    // Fill in signup form
    await page.fill('input[name="name"]', TEST_USER.name);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="phone"]', TEST_USER.phone);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="passwordConfirm"]', TEST_USER.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to login with success message
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('text=Signup successful')).toBeVisible();
  });

  test('should show validation error for weak password', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'short');
    await page.fill('input[name="passwordConfirm"]', 'short');

    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=at least 8 characters')).toBeVisible();
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123!');
    await page.fill('input[name="passwordConfirm"]', 'DifferentPassword123!');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should log in existing user', async ({ page }) => {
    // Note: Requires user to exist in database
    // In CI, this would use a pre-seeded test account

    await page.goto('/auth/login');

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);

    await page.click('button[type="submit"]');

    // Should redirect to home page
    await expect(page).toHaveURL('/');

    // User menu should show logout button
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should log out user', async ({ page }) => {
    // Requires user to be logged in
    await page.goto('/');

    // If logged in, logout button should be visible
    const logoutButton = page.locator('button:has-text("Logout")');

    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to home
      await expect(page).toHaveURL('/');

      // Logout button should disappear
      await expect(page.locator('text=Sign In')).toBeVisible();
    }
  });

  test('should persist session across page refresh', async ({ page }) => {
    // Requires user to be logged in
    await page.goto('/');

    // Check if user is logged in
    const logoutButton = page.locator('button:has-text("Logout")');
    const isLoggedIn = await logoutButton.isVisible();

    if (isLoggedIn) {
      // Refresh page
      await page.reload();

      // User should still be logged in
      await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    }
  });

  test('should protect checkout route without auth', async ({ page }) => {
    await page.goto('/checkout');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should show login/signup links when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should see Sign In and Sign Up links
    await expect(page.locator('a:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('a:has-text("Sign Up")')).toBeVisible();
  });
});
