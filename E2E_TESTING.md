# E2E Testing Guide

This project uses Playwright for end-to-end testing. Tests cover the complete user journey from browsing products to checkout.

## Installation

Playwright is already installed as a dev dependency. To install browsers on first run:

```bash
npx playwright install
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Run tests in a specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project="Mobile Chrome"
```

## Test Structure

Tests are located in the `e2e/` directory. Current test suites:

- **homepage.spec.ts** — Core user flows:
  - Homepage loads with featured products
  - Navigate to product detail page
  - View product variants
  - Add product to cart
  - View cart items
  - Remove item from cart

## Before Running Tests

1. Ensure the dev server is running (tests will start it automatically if `reuseExistingServer` is false):
   ```bash
   npm run dev
   ```

2. Database must be seeded with sample products. Run migrations if not done:
   ```bash
   supabase migration up
   ```

3. Environment variables must be configured in `.env.local`

## Test Selectors

Components include `data-testid` attributes for reliable element targeting:
- `data-testid="product-card"` — Product card in grid
- `data-testid="cart-link"` — Cart navigation link
- `data-testid="cart-badge"` — Cart item count badge
- `data-testid="cart-item"` — Individual cart item row

## Debugging Failed Tests

1. Check the HTML report:
   ```bash
   npx playwright show-report
   ```

2. Enable trace collection (already on for failed tests):
   - Traces appear in `test-results/` directory
   - View with: `npx playwright show-trace trace.zip`

3. Use debug mode to step through tests interactively:
   ```bash
   npm run test:e2e:debug
   ```

## CI/CD Integration

Tests run in single-threaded mode on CI with 2 retries. Configure in `playwright.config.ts`:
- Set `process.env.CI` to enable CI mode
- Tests will use headless Chrome only

## Adding New Tests

1. Create a new `.spec.ts` file in `e2e/` directory
2. Import test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Write tests following the existing pattern
4. Use `data-testid` selectors for reliable targeting
5. Run tests to verify they pass

## Common Issues

**"Target page, context or browser has been closed"**
- Dev server not running. Start with `npm run dev` or enable `webServer` in config

**"Timeout waiting for element"**
- Element selector is incorrect. Check with `npm run test:e2e:ui` to inspect
- Component may not be rendering. Check RLS policies and Supabase connection

**"Connection refused to localhost:3000"**
- Dev server failed to start. Check for port conflicts or build errors
- Review `.env.local` for missing environment variables

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
