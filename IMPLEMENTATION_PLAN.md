# Technical Implementation Plan: Muskan Care Center E-Commerce Store

**Status**: For review and approval before development begins  
**Last Updated**: 2026-08-16  
**Prepared for**: Next.js + Supabase stack (per CLAUDE.md constitution)

---

## 1. Recommended Stack & Architecture

### Core Technology Decisions

**Next.js 14+ (App Router) + Supabase**
- **Rationale**: Aligns with project constitution; no additional dependencies for auth or database
- **Why this pair**: Supabase provides PostgreSQL + Auth + RLS out-of-box; Next.js Server Actions handle all payment/inventory mutations server-side, avoiding client-side trust issues
- **Verification**: Constitution mandates Next.js App Router + Supabase only; no deviation proposed

**Authentication: Better Auth (with Supabase Database Backend)**
- **Recommended approach**: Use Better Auth library for email/password authentication, sessions, and password reset; store session state in Supabase database with RLS policies
- **Why**: Better Auth provides more control over session timing (activity-based timeout) than Supabase Auth; integrates cleanly with RLS for role-based access control
- **Session management**: Activity-based timeout (2 weeks for customers, 1 hour for admins) enforced via middleware; session heartbeat on every request updates `last_activity` timestamp in `sessions` table
- **JWT & Refresh Tokens**: Better Auth handles refresh token rotation; tokens stored server-side (httpOnly cookies, secure by default)
- **Alternatives considered**:
  - Supabase Auth: Less flexible for custom session timing logic
  - NextAuth.js: More heavyweight; Better Auth sufficient for email/password + role isolation
  - Custom JWT: Reinventing session management; Better Auth handles this with security best practices
- **Trade-offs**: External dependency (Better Auth package); justified by superior session control and developer experience

**Payment Gateways: Direct integration with JazzCash & Easypaisa APIs**
- **Rationale**: No payment processing dependency required; gateways are HTTP APIs
- **Why**: Constitution prohibits unnecessary dependencies; direct HTTPS calls to gateway endpoints are simpler than middleware libraries
- **Approach**: Server Actions handle payment requests/responses; payment webhook handlers validate signatures server-side
- **Alternatives considered**:
  - Stripe/PayPal: Overkill and require external account setup; JazzCash/Easypaisa don't integrate with major platforms
- **Trade-offs**: Custom webhook validation (small scope); no fraud detection layer (defer to Phase 2)

**Email: Supabase Email or third-party service (Resend/SendGrid)**
- **Recommended approach**: Supabase Email for initial phase (no external dependency); scale to SendGrid if needed
- **Why**: Supabase includes email service; low cost for <10k emails/month; no additional secrets to manage
- **Alternatives considered**:
  - Mailgun: Requires API key; more complex than Supabase
  - Node Mailer + SMTP: Requires SMTP server setup; less reliable than SaaS
- **Trade-offs**: Basic email delivery; no advanced analytics (sufficient for Phase 1)

**Database: PostgreSQL (via Supabase)**
- **Approach**: Single PostgreSQL database with Supabase-managed hosting
- **Why**: Relational model fits inventory/order/payment schema; RLS policies enforce security at database level (not application)
- **Alternatives considered**:
  - MongoDB: No row-level security; would require application-layer auth (violates constitution principle of security-by-default)
- **Trade-offs**: Relational schema requires careful design; no unstructured blobs (acceptable for e-commerce)

**Caching: Redis (Upstash) for sessions and inventory locks**
- **Recommended approach**: Upstash Redis for distributed session storage and checkout inventory reservations
- **Why**: Checkout inventory reservation (30-minute window) needs fast, TTL-based storage; session activity tracking benefits from centralized state
- **Why not just database**: Database queries too slow for 30-second inventory checks during high concurrency; Redis O(1) lookups essential
- **Alternatives considered**:
  - In-memory Node cache: Works for single-instance; doesn't scale to multiple Next.js replicas
  - Supabase Realtime: Designed for subscriptions, not session/lock storage
- **Trade-offs**: New external dependency (justified by performance + scaling); one more secret to manage (stored in env)

**Frontend State Management: React Context + Server Actions**
- **Approach**: Minimal client state; cart and UI state only; all mutations go through Server Actions
- **Why**: Constitution prefers Server Components; cart is simple enough for React Context; Server Actions prevent client-side price manipulation
- **Alternatives considered**:
  - Redux/Zustand: Overkill for this app; adds bundle size
  - TanStack Query: Useful for caching; unnecessary if Server Actions handle fetching
- **Trade-offs**: Less client-side flexibility; increased server round-trips (acceptable, improves security)

**File Storage: Supabase Storage (S3-compatible)**
- **Approach**: Store product images in Supabase Storage
- **Why**: Integrated with Supabase; no separate S3 account; images served via CDN automatically
- **Alternatives considered**:
  - AWS S3 directly: Possible, adds secrets management; Supabase Storage simpler
- **Trade-offs**: Vendor lock-in to Supabase; acceptable given all other infrastructure already there

---

## 2. Application Structure

### Directory Layout (High-Level)

```
mstore/
├── app/                          # Next.js App Router
│   ├── (customer)/               # Customer-facing routes (grouped layout)
│   │   ├── layout.tsx            # Customer header, nav
│   │   ├── page.tsx              # Homepage
│   │   ├── products/             # Product browsing
│   │   ├── product/[id]/         # Product detail
│   │   ├── cart/                 # Cart page
│   │   ├── checkout/             # Checkout flow (steps)
│   │   ├── order/[id]/           # Order detail
│   │   ├── account/              # Customer account pages
│   │   └── auth/                 # Login, register, password reset
│   ├── (admin)/                  # Admin-only routes
│   │   ├── admin/layout.tsx      # Admin header, sidebar
│   │   ├── admin/dashboard/      # Admin dashboard
│   │   ├── admin/products/       # Product management
│   │   ├── admin/orders/         # Order management
│   │   ├── admin/payments/       # Payment tracking
│   │   ├── admin/settings/       # Admin settings
│   │   └── admin/customers/      # Customer list
│   ├── api/                      # API routes (webhooks, payments)
│   │   ├── webhooks/jazz-cash    # JazzCash webhook
│   │   ├── webhooks/easypaisa    # Easypaisa webhook
│   │   ├── payment/              # Payment initiation endpoints
│   │   └── auth/                 # Auth callbacks
│   ├── middleware.ts             # Session validation, RLS enforcement
│   └── layout.tsx                # Root layout
├── components/
│   ├── customer/                 # Reusable customer components
│   ├── admin/                    # Reusable admin components
│   ├── common/                   # Shared (ProductCard, etc.)
│   └── ui/                       # Atomic components (Button, Input, etc.)
├── lib/
│   ├── supabase/                 # Supabase client + RLS helpers
│   ├── auth/                     # Auth helpers
│   ├── payments/                 # Payment gateway integration
│   ├── email/                    # Email templates + sending
│   ├── inventory/                # Inventory reservation logic
│   ├── validation/               # Schema validation (Zod)
│   └── utils/                    # General utilities
├── server/
│   ├── actions/                  # Server Actions (grouped by domain)
│   │   ├── products.ts
│   │   ├── cart.ts
│   │   ├── orders.ts
│   │   ├── payments.ts
│   │   ├── auth.ts
│   │   └── admin.ts
│   └── db/                       # Supabase queries (not directly; via RLS)
├── hooks/
│   ├── useCart.ts                # Cart state + sync
│   ├── useAuth.ts                # Auth context
│   └── useSession.ts             # Session timing
├── types/
│   ├── database.ts               # Generated from Supabase schema
│   ├── api.ts                    # API request/response types
│   └── business.ts               # Domain types (Order, Product, etc.)
├── migrations/                   # Supabase SQL migrations
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   └── ...
├── public/
│   ├── images/                   # Static assets
│   └── styles/                   # Global CSS
├── env.example                   # Template for .env.local
├── package.json
└── tsconfig.json
```

### Why This Structure

- **Grouped routes**: `(customer)` and `(admin)` use Next.js route groups to separate concerns; shared middleware applies to both
- **Server Actions**: Centralized in `server/actions/` for clear audit trail; all mutations go through here
- **No /lib/db files**: Database queries are performed through RLS-protected Supabase client; no raw SQL in application layer
- **Types generated**: `database.ts` auto-generated from Supabase schema (via CLI); keeps types in sync
- **Migrations tracked**: All schema changes via SQL migrations (not dashboard edits, per constitution)

---

## 3. Customer-Facing Experience

### Pages & Flows

**Homepage** (`app/(customer)/page.tsx`)
- Server Component: Fetch featured products, categories
- Client Component (embedded): Shopping cart summary, category filter
- No client-side state persistence needed (cart is in React Context)

**Product Browsing** (`app/(customer)/products/`)
- Server Component: Fetch products, pagination, filters (category, price)
- Search: Via Next.js API route (Server Action)
- Per-page: 20 products (paginated)
- Filtering: Stacked filters (category + price + availability)

**Product Detail** (`app/(customer)/product/[id]/`)
- Server Component: Fetch product, variants, images, related products
- Client Component: Add to cart button, quantity selector, image gallery
- Recommendations: Query Supabase for products in same category (rule-based; no ML)

**Shopping Cart** (`app/(customer)/cart/`)
- Client Component: Managed by React Context (items + quantities)
- Server sync: On page load, validate cart items against inventory (via Server Action)
- Persistence: localStorage + Context (restore on page reload)
- Remove/update: Optimistic UI update + Server Action validation
- Behavior per spec:
  - Cart persists for 30 days (stored in `carts` table with activity timestamp)
  - Merging: On guest-to-account upgrade, guest cart merged if within 30 days

**Checkout** (`app/(customer)/checkout/`)
- Multi-step flow (4 steps):
  1. **Cart Review**: Confirm items, show subtotal
  2. **Delivery Address**: New or saved (if logged in)
  3. **Payment Method**: COD, JazzCash, Easypaisa
  4. **Review & Submit**: Final confirmation
- Each step is a Server Action:
  - Validate cart inventory (at each step, not just final)
  - Lock inventory (30-minute reservation at step 1)
  - Create order in DB
  - For prepaid methods: redirect to payment gateway
- Security: All prices recalculated server-side; no client manipulation possible

**Order Confirmation** (`app/(customer)/checkout/confirmation/`)
- Shown immediately after order creation (for COD)
- For prepaid: shown after payment gateway redirects back
- Displays order ID, items, delivery address, tracking link (if available)
- Email sent asynchronously (Server Action + background job)

**Order Detail** (`app/(customer)/order/[id]/`)
- Fetch order + payment status (RLS enforces customer ownership)
- Guest access: Token-based URL (`/order/[id]?token=xyz`) for unauthenticated customers
  - Token generated at order creation; time-limited (30 days)
  - Token sent in confirmation email
- Status timeline: Show all transitions (pending → confirmed → shipped → delivered)
- Actions:
  - Cancel (if not shipped): Server Action
  - Request refund (if delivered): Server Action
  - Download invoice: Server Action (generate PDF via library, no new dependency)

**Account Pages** (`app/(customer)/account/`)
- Profile: Display + edit name, email, phone
- Addresses: List, add, edit, delete (linked to future orders)
- Order History: Paginated list with filters (date, status)
- Password change: Form with validation
- Session activity: Show last login, current session

### State Management Strategy

**React Context for Cart**
```
CartContext {
  items: CartItem[]
  addItem(product, variant, quantity)
  updateQuantity(itemId, quantity)
  removeItem(itemId)
  clearCart()
  syncWithServer() // Validate + fetch latest prices
}
```

**Server Actions for Side Effects**
- All mutations (cart → order, order status change, etc.) via Server Actions
- Client never sends price data; prices always recalculated server-side

**Session/Auth Context**
```
AuthContext {
  user: User | null
  isLoading: boolean
  login(email, password)
  logout()
  signUp(email, password, name)
  resetPassword(email)
}
```

---

## 4. Authentication & Authorization

### Architecture

**Authentication Layer (Better Auth)**
- Email/password registration and login via Better Auth
- Session tokens (access + refresh) with httpOnly cookies (secure by default)
- Password reset flow: Email link (valid 30 min), token validation
- Activity-based session timeout: Timestamp updated on every request, checked against timeout threshold
- Better Auth handles session refresh automatically

**Authorization Layer (RLS Policies)**
- Every table has default-deny RLS policies
- Policies enforce: `auth.uid() = user_id` for customer data, role-based for admin
- Server Actions pass authenticated user context to RLS

**Middleware** (`app/middleware.ts`)
- On every request: Check session validity
- Verify `auth.uid()` exists and matches user_id in token
- Redirect unauthenticated users to login (for protected routes)
- Rate-limit login attempts (via Upstash Redis)

### User Roles & Permissions

**Customer Role**
- Can browse products, manage cart, create orders, view own orders
- Cannot access admin panel
- Cannot modify prices or inventory
- Guest checkout allowed (no role required)

**Admin Role**
- Can manage products, orders, payments, settings, customers
- Cannot be assigned to customer accounts
- All actions logged

**Service Role (Backend Only)**
- Used by Next.js for server-side operations requiring elevated privileges
- Never exposed to client
- Example: Creating order (uses service role to check inventory, then RLS to insert order)

### Session Timeout

**Implementation**
- Stored in Redis: `session:{sessionId}:lastActivity = {timestamp}`
- On every authenticated request: Check `now - lastActivity > timeout`
- If expired: Invalidate session, redirect to login
- On user action (any page load): Update lastActivity timestamp

**Timeout Values**
- Customer: 2 weeks (from spec)
- Admin: 1 hour (from spec)
- Checkout session (inventory reservation): 30 minutes (from spec)

---

## 5. Product & Variant Management

### Data Model

**Products**
- `id, name, description, sku, price, category_id, is_active, created_at, updated_at`
- `category_id`: Foreign key to categories table
- `is_active`: Boolean; inactive products hidden from storefront but visible in order history
- `price`: Decimal(10, 2); cannot be null

**Variants**
- `id, product_id, name (e.g., "Size M"), sku_suffix, price_override, created_at`
- `price_override`: Nullable; if null, use product.price
- Example: Product "T-Shirt" has variants {Size S, Size M, Size L}

**Product Images**
- `id, product_id, image_url, display_order, created_at`
- `image_url`: URL in Supabase Storage (not raw binary)
- Main image: First image by display_order
- Gallery: All images displayed on detail page

**Categories**
- `id, name, parent_id, slug, created_at`
- Hierarchical: `parent_id` nullable; allows subcategories
- Example: "Personal Care" > "Hair Care" > "Shampoos"

**Bundles**
- `id, name, description, bundle_price, regular_price, discount_percent, is_active, active_from, active_to, created_at`
- `bundle_price`: Locked price for bundle
- `is_active`: Admin can enable/disable bundleExecution
- `active_from / active_to`: Temporal activation (nullable)

**Bundle Items**
- `id, bundle_id, product_id, variant_id, quantity`
- `variant_id`: Nullable; if null, product default variant or first variant used
- Example: Bundle "Summer Kit" contains {Soap (qty 2), Shampoo (qty 1)}

### Admin Product Management

**Add Product** (Server Action)
- Form: name, description, category, price, sku, images
- Validation: Name required, price > 0, category exists
- On submit: Create product row, upload images to Supabase Storage, store URLs
- Return: Product ID + redirect to product detail

**Edit Product** (Server Action)
- Form: All fields + toggle active/inactive
- On submit: Update product row, handle image uploads/removals
- Broadcast update (optional): If using Supabase Realtime, notify connected clients to refresh

**Bulk Upload** (Server Action)
- Accept CSV: name, sku, category, price, stock
- Validation: All rows validated before creation (all-or-nothing per spec)
- If validation fails: Return error report with row numbers + specific field errors
- If valid: Create all products + return success count
- Idempotency: If same SKU exists, skip (don't update)

**Disable Product** (Soft Delete)
- Set `is_active = false`
- Product remains in database (not deleted)
- Product remains visible in order history (historical records)
- Hidden from storefront: Query filters `WHERE is_active = true`
- Admin can re-enable by setting `is_active = true`
- Benefit: No data loss; preserves referential integrity with past orders

### Inventory Management

**Stock Tracking**
- `product_inventory (product_id, variant_id, quantity, reserved, created_at, updated_at)`
- `quantity`: Total available units
- `reserved`: Units locked during checkout (expires after 30 min)
- `available = quantity - reserved`

**Stock Updates**
- Admin sets quantity directly (Server Action)
- **Required: Document reason for adjustment** (from decision)
- Adjustment form: New quantity, reason dropdown (Damaged/Lost/Return/Physical Count/Correction/Other), optional notes
- Automatic decrements when order confirmed
- Manual adjustment via form: Admin enters new quantity and reason; system logs the adjustment with reason in audit_logs
- Benefit: Audit trail shows why inventory changed (accountability)

**Low Stock Alerts**
- Threshold: Global default = 5 units (per spec, Option D)
- Per-product override: Admin can set custom threshold for individual products
- Alert trigger: On inventory update, if `available <= threshold`, mark alert as active
- Alert display:
  - **Dashboard**: Red badge on low-stock products in inventory view; count of all low-stock items in dashboard summary
  - **Email**: Daily digest email to admin (morning at 9am) listing all products with stock <= threshold; includes quantities and restock recommendations
  - Optional: Real-time email on low-stock (Phase 2)

---

## 6. Inventory & Reservation System

### Checkout Reservation Flow

**Step 1: User begins checkout (cart → address)**
- Server Action: `reserveInventory(cartItems)`
  - Lock inventory at **checkout start**, not at cart add
  - For each cart item, check `available >= quantity`
  - If all pass: Increment `reserved` for each item, store reservation in Redis with 30-min TTL
  - Return success or error (which items failed)
  - If error: Return to cart with message; cart is preserved

**Step 2: User completes checkout (review → submit)**
- Server Action: `createOrder(cartItems, address, paymentMethod)`
  - Re-validate inventory: Fetch current `available` for each item
  - If any item insufficient: Return error, preserve cart, clear reservation from Redis
  - Create order row in `orders` table with status = "pending_payment" (prepaid) or "confirmed" (COD)
  - Decrement inventory: `quantity -= quantityOrdered` (atomic operation)
  - Release reservation: Remove from Redis
  - Return order ID

**Step 3: Timeout (user abandons checkout)**
- Redis TTL (30 minutes): Automatically expires reservation key; no explicit cleanup needed
- If user resumes checkout after expiration: Re-validate and re-reserve inventory

**Step 4: Final validation before payment gateway**
- For prepaid orders: Before redirecting to payment gateway, re-check inventory one more time
- If out of stock: Show error, release reservation, return to cart

### Race Condition Prevention

**Atomic Inventory Check**
```sql
-- Example: Reserve inventory atomically
BEGIN;
SELECT quantity, reserved 
FROM product_inventory 
WHERE product_id = ? AND variant_id = ? 
FOR UPDATE;  -- Lock row

IF (quantity - reserved) >= requested_quantity THEN
  UPDATE product_inventory 
  SET reserved = reserved + requested_quantity 
  WHERE product_id = ? AND variant_id = ?;
  COMMIT;
ELSE
  ROLLBACK;
  RAISE ERROR 'Insufficient inventory';
END IF;
```

**Upstash Redis for Speed**
- While database provides correctness, Redis caches available inventory for fast checks
- Redis key: `inv:{productId}:{variantId} = { available, reserved, updated_at }`
- On inventory update: Invalidate Redis key (query fresh from DB on next checkout)
- On checkout: Fast check from Redis, then verify in DB before final order

### Overselling Prevention

- Final check before order creation uses `FOR UPDATE` lock (prevents race conditions)
- If still insufficient, order creation fails (RLS error or application error)
- Cart is returned to user; reservation is released

---

## 7. Cart & Guest Checkout

### Cart Persistence

**Storage Strategy**
- Primary: React Context (in-memory)
- Secondary: Supabase `carts` table (backup)
- Sync: On page load, fetch from table + merge with localStorage

**Carts Table Schema**
```
carts (
  id UUID PRIMARY KEY,
  user_id UUID (nullable - for guests),
  guest_email VARCHAR (nullable - for guest identification),
  items JSONB (array of {productId, variantId, quantity}),
  created_at TIMESTAMP,
  last_activity TIMESTAMP,
  expires_at TIMESTAMP (30 days from last_activity)
)
```

**Expiration**
- Guest carts expire 30 days after last activity
- On each cart update: Set `last_activity = now()` and `expires_at = now + 30 days`
- Background job: Delete expired carts monthly (via pg_cron)

**Guest-to-Account Migration**
- At signup with existing email: Query for guest cart with matching `guest_email`
- If found and not expired: Merge into customer's cart
  - For duplicate items (same product + variant): Combine quantities
  - Remove guest cart row

### Guest Checkout Flow

**Scenario B (from spec)**
1. Customer adds items to cart (no login required)
2. At checkout: Click "Continue as Guest"
3. Enter email, delivery address, select payment method
4. Create order with `user_id = NULL`, `guest_email = customer_email`
5. Send confirmation email
6. After order completed:
   - Show "Create Account" prompt
   - If user creates account with same email: Account created, past guest orders linked (after email verification)

**Email Verification for Account Linking** (Automatic)
- User registers with email previously used for guest orders
- Email verification link sent
- After verification: System automatically links `user_id` to all guest orders with matching verified email (via Server Action triggered after email verification)
- User sees notification: "X past guest orders have been linked to your account"
- RLS policy: Guest orders visible to their creator (no user_id) OR to logged-in user with matching verified email

**Order Access for Guests**
- Guest order detail page: `/order/[id]?token={secureToken}`
- Token generated at order creation
- Token verified on load: Check `orders.guest_token_expires_at > now()`
- No user_id required; token is sufficient for access
- RLS policy: Allow access if token matches or user_id matches

### Cart Line Item Consolidation

**Rule**: Identical product + variant combinations are consolidated into one line item with summed quantity

**Example**
```
Cart Items:
- Product A, Variant M, Qty 1 (added at 2pm)
- Product A, Variant M, Qty 2 (added at 3pm)

After consolidation:
- Product A, Variant M, Qty 3
```

**Implementation**
- On `addItem`: Check if item with same product_id + variant_id exists
- If yes: Update quantity instead of adding new line
- If no: Add new line

---

## 8. Bundle Offers

### Bundle Management

**Admin Create Bundle** (Server Action)
- Form: name, description, select products + variants + quantities, set bundle price
- Validation:
  - At least 2 items required (business rule)
  - Prices must be > 0
  - Regular price = sum of item prices
  - Bundle price must be < regular price (discount enforcement)
- On submit: Create `bundles` row + `bundle_items` rows
- Return: Bundle ID

**Admin Edit Bundle** (Server Action)
- Edit name, description, price, active status, start/end dates
- Change items: Allow adding/removing items, updating quantities
- Validation: Same as creation

**Bundle Visibility**
- `is_active = true` AND current time within `active_from..active_to` (if set)
- All bundle items must have `quantity > 0` (at least 1 available unit each)
- If any item becomes out of stock: Bundle hidden from storefront (is_active set to false, or query filters it out)

### Bundle Pricing & Locking

**Pricing Lock Timing** (per spec clarification)
- Lock at: **Checkout start** (Step 1: Cart Review → Step 2: Address)
- Mechanism: When user enters checkout, store current `bundle_price` in checkout session (Redis key-value store with 30-min TTL)
- Effect: If bundle price changes after checkout begins, original locked price is honored throughout checkout
- If bundle price changes before checkout begins: New price applies (customer sees updated price in cart, or bundle may become hidden if price incentive removed)

**Checkout Enforcement**
- At Step 2 (Address): Fetch current bundle_price from database, compare to session-locked price
- If prices differ by > 5%: Alert customer that pricing has changed, show new price, allow them to restart checkout with new price or continue with old price
- If significant downward change (customer gets better deal): Auto-apply new price
- Before order creation: Final verification that bundle_price matches (prevent client manipulation)

### Bundle Handling in Cart & Checkout

**Cannot break bundles**
- Bundle is atomic; cannot remove individual items
- Remove action: Removes entire bundle from cart

**Display in Cart**
- Show as single line item with badge "Bundle"
- List included products and quantities underneath (informational)
- Show total savings: `regular_price - bundle_price`

**Inventory Reservation**
- Reserve all bundle items together
- If any item unavailable: Entire bundle fails reservation

---

## 9. Order Lifecycle & State Machine

### Order Status Transitions

```
Customer COD Orders:
pending → confirmed → shipped → delivered
  ↓
cancelled (anytime before shipped)
  ↓
refund_requested (after delivered)
  ↓
refunded

Prepaid Orders (JazzCash/Easypaisa):
pending_payment → confirmed → shipped → delivered
  ↓
pending_payment ← (payment fails, can retry)
  ↓
cancelled (only if pending_payment, before confirmed)
  ↓
refund_requested (after delivered)
  ↓
refunded
```

**Admin Actions**
- Change status: pending → confirmed → shipped → delivered (manual transitions)
- Cancel: pending/confirmed → cancelled
- Refund: delivered → refund_requested → refunded

**Customer Actions**
- Cancel: pending/confirmed → cancelled (not allowed if shipped)
- Request refund: delivered → refund_requested

**System Actions**
- On payment success (prepaid): pending_payment → confirmed
- On payment failure (prepaid): pending_payment (no state change; stays "pending payment")
- On order timeout (COD unpaid 7+ days): Flag in dashboard, no state change

### Payment Status Tracking (Separate from Order Status)

```
COD Orders:
awaiting_cod (initial) → paid (admin marks as received)

Prepaid Orders:
pending → paid (gateway confirms) OR failed (gateway declines)
  ↓
pending (retry allowed up to 3 failures over 7 days)
```

**Mismatch Detection**
- Alert if: order status = "confirmed" but payment status = "failed"
- Alert if: order status = "pending" but payment status = "paid"
- Manual review required

### Order Schema

```
orders (
  id UUID PRIMARY KEY,  -- Non-sequential, alphanumeric (ORD-XXXXXXX)
  user_id UUID (nullable - for guests),
  guest_email VARCHAR (for guest tracking),
  guest_token UUID,     -- For guest access verification
  guest_token_expires_at TIMESTAMP,
  items JSONB,          -- Snapshot of items ordered
  delivery_address JSONB,
  order_status VARCHAR ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded'),
  payment_method VARCHAR ('cod', 'jazz_cash', 'easypaisa'),
  payment_status VARCHAR ('awaiting_cod', 'pending', 'paid', 'failed'),
  total_amount DECIMAL(10, 2),
  subtotal DECIMAL(10, 2),
  tax_amount DECIMAL(10, 2),
  delivery_fee DECIMAL(10, 2),
  payment_fee DECIMAL(10, 2),
  refund_amount DECIMAL(10, 2) (nullable),
  refund_reason TEXT (nullable),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  status_history JSONB -- [{status, changedAt, changedBy}]
)
```

---

## 10. Payment Processing

### COD (Cash on Delivery)

**Flow**
1. Customer selects COD at checkout
2. Order created with status = "confirmed", payment_status = "awaiting_cod"
3. Confirmation email sent: "Order confirmed, payment due on delivery"
4. Customer receives order at delivery address, pays driver
5. Admin logs into dashboard, finds order, clicks "Mark as Paid"
6. Payment status updated to "paid"
7. Customer email sent: "Payment received"

**Admin Dashboard for COD**
- List of "Confirmed" orders with payment_status = "awaiting_cod"
- One-click "Mark as Paid" button
- Bulk action: Select multiple orders, mark as paid

**Refunds for COD**
- Order marked "refund_requested" by customer or admin
- Admin approves refund
- Customer provides: Bank account number, JazzCash number, or Easypaisa number
- Admin processes refund manually (via bank transfer or mobile wallet)
- Order status = "refunded", payment_status = "paid" (cash was received)

### JazzCash & Easypaisa

**Flow (Prepaid)**
1. Customer selects payment method at checkout
2. Order created with status = "pending_payment"
3. Customer redirected to payment gateway (JazzCash/Easypaisa)
4. Customer enters credentials, approves payment
5. Gateway processes payment, returns result (success/fail)
6. Gateway redirects to `/checkout/confirmation?orderId={id}&status=success/failed`
7. If success: Order status = "confirmed", payment_status = "paid"
   - Confirmation email sent: "Payment successful, order confirmed"
8. If failed: Order status = "pending_payment", payment_status = "failed"
   - Customer can retry from order detail page

**Payment Retry**
- Same order ID used for retries
- No new order created on retry
- **Max 3 counted failures per order over 7 days** (from spec clarification)
- **Counted failures**: Genuine payment declines (insufficient funds, card declined, declined by gateway)
- **Not counted as failures**: Network timeouts, gateway unavailable (502/503), customer cancellation
- After 3 counted failures: Admin alerted via email + dashboard flag, manual review required
- Orders unpaid > 7 days: Marked "overdue pending", admin can cancel or retry manually
- After 7 days: Order can no longer accept new payment attempts; admin must manually handle (cancel, refund, or reset timer)

**Webhook Handling**
- Gateway posts to `/api/webhooks/{gateway}`
- Webhook signature verified (use gateway's public key)
- Idempotent: If payment already recorded, duplicate webhook ignored
- Late webhook (hours after initial response): Check if order already paid, if not, update and notify customer
- Retry webhooks for 24 hours if initially failed (via pg_cron or background job)

### Payment Failure Scenarios

**Counted as Failure** (increments `payment_attempts.counted_failures`)
- Card declined (insufficient funds, expired card, fraud block)
- Customer enters wrong credentials
- Gateway reports "Payment declined"

**Not Counted as Failure** (customer can retry immediately without penalty)
- Network timeout (connection interrupted)
- Gateway temporarily unavailable (502/503)
- Customer cancels payment before final confirmation
- System/application error during payment processing

**Implementation**
- Track failure count in `payment_attempts` table (linked to order)
- Log: timestamp, gateway response code, reason, is_counted_failure flag
- On 3rd counted failure: Send email to admin with order ID + customer contact + retry instructions
- System also sends email to customer: "Payment failed 3 times. Contact support or we'll auto-cancel in 7 days if unpaid."
- Admin can then investigate (contact customer, manually approve, cancel, refund)

### Payment Gateway Integration

**JazzCash Integration**
- Endpoint: `https://sandbox.jazzcash.com.pk/` (test) → production
- Request: POST with merchant account, amount, order ID, callback URL
- Response: Redirect URL for customer
- Callback: Query gateway for payment status (both immediate redirect and webhook)

**Easypaisa Integration**
- Similar pattern to JazzCash
- Endpoint: Gateway-provided URL
- Callback: Webhook + redirect

**Implementation Detail**
- Never store gateway secrets in Next.js client code
- All gateway requests: Signed server-side via Server Action
- Secret stored in `process.env.JAZZ_CASH_SECRET` (only accessible server-side)
- Webhook signature verified using published gateway public key

---

## 11. Email Integration

### Email Service

**Recommended**: Supabase Email (no external dependency)
- Plan: Up to 30 emails/day free, then ~$0.01 per email
- For 100 daily orders at 1-2 emails each: ~$30-60/month
- Scaling: If > 10k emails/month, migrate to SendGrid (more cost-effective)

### Email Templates

All templates include:
- Muskan Care Center branding (logo, name)
- Support contact info (email, phone, website, social media links) - **configurable via admin settings**
- Unsubscribe link (if applicable)

**1. Order Confirmation**
- Trigger: Order created (after status confirmed or prepaid order created)
- Recipients: Customer email
- Content:
  - Order ID
  - Items ordered (name, variant, quantity, price)
  - Delivery address
  - Subtotal, taxes, delivery fee, total
  - Payment method + payment status
  - Expected delivery: 2-5 business days
  - Order tracking link (if shipped)
  - Support contact

**2. Payment Confirmation** (Prepaid only)
- Trigger: Payment success confirmed
- Recipients: Customer email
- Content:
  - Order ID
  - Amount paid
  - Payment reference
  - Timestamp
  - Next steps

**3. Payment Failure Alert** (Prepaid only, system-generated)
- Trigger: Payment declined
- Recipients: Customer email
- Content:
  - Order ID
  - Failure reason (from gateway)
  - Retry link (with order ID)
  - Support contact
  - Deadline: 7 days to retry
  - Retry attempt count: "Attempt 1 of 3" shown in email
- Sent immediately after payment failure (Server Action triggered from gateway callback)

**4. Order Status Update** (Shipped, Delivered, Cancelled)
- Trigger: Admin updates status or system transitions
- Recipients: Customer email
- Content:
  - Order ID
  - New status
  - Tracking info (if shipped)
  - Expected delivery (if applicable)

**5. Refund Notification**
- Trigger: Refund approved and processed
- Recipients: Customer email
- Content:
  - Order ID
  - Refund amount
  - Refund method (bank/JazzCash/Easypaisa)
  - Expected timeline (3-5 business days)
  - Support contact if issues

**6. Admin Alert** (Low stock, failed payment, other)
- Trigger: Various conditions
- Recipients: Admin email
- Content: Alert details, action link to dashboard

### Email Configuration Management

**Admin Settings** (`app/(admin)/admin/settings/email/`)
- Edit email sender name: "Muskan Care Center"
- Edit support email: support@muskancare.com
- Edit support phone: +92-3XX-XXXXXXX
- Edit website URL: https://muskancare.com
- Edit social media links: Facebook, Instagram, WhatsApp
- Save to `settings` table (single row)
- On email send: Fetch settings, include in template

### Email Sending Implementation

**Server Action for Sending**
```typescript
async function sendOrderConfirmation(orderId: string) {
  const order = await supabase.from('orders').select('*').eq('id', orderId);
  const settings = await supabase.from('settings').select('*').single();
  
  const emailBody = renderTemplate('order-confirmation', {
    order,
    contactInfo: {
      email: settings.support_email,
      phone: settings.support_phone,
      website: settings.website_url
    }
  });
  
  await supabase.auth.admin.sendEmail({
    email: order.guest_email || order.user.email,
    subject: `Order Confirmation #${order.id}`,
    html: emailBody
  });
  
  // Log email delivery
  await supabase.from('email_logs').insert({
    order_id: orderId,
    recipient: order.guest_email || order.user.email,
    subject: '...',
    sent_at: new Date(),
    status: 'sent'
  });
}
```

**Retry on Failure**
- If email send fails: Catch error, insert into `email_queue` table
- Background job (via pg_cron): Every 5 minutes, query `email_queue` with `retry_count < 3`
- Retry up to 3 times over 24 hours
- If all retries fail: Mark as "failed", alert admin

---

## 12. Admin Dashboard & Management

### Dashboard Overview** (`app/(admin)/admin/dashboard/`)

**Key Metrics (Server Component)**
- Today's orders: Count of orders created today
- Today's revenue: Sum of confirmed orders' totals
- Pending orders: Count of orders with status != confirmed/shipped/delivered/cancelled
- Failed payments: Count of orders with payment_status = "failed"
- Low stock alerts: Count of products with available <= threshold

**Charts (if time permits; optional)**
- Orders by day (last 7 days)
- Payment method breakdown (pie chart: COD vs Jazz Cash vs Easypaisa)
- Revenue trend (last 30 days)

**Quick Links**
- Add new product
- View pending orders
- View failed payments
- Manage inventory

### Product Management** (`app/(admin)/admin/products/`)

**Product List**
- Paginated table: Name, SKU, Category, Price, Stock, Active status
- Filters: Category, active/inactive, search by name/SKU
- Actions: Edit, disable/enable (soft delete)
- Bulk upload button

**Product Detail** (Edit)
- Form fields: Name, description, category, SKU, price, images
- Image management: Upload, reorder, delete
- Variants section: List, add, edit, delete variants
- Stock level: Current quantity, reserved quantity, available
- Pricing: Base price + variant overrides
- Active/Inactive toggle: Disable/enable product (soft delete)
- Save button: Updates product + images

**Bulk Upload**
- File upload: CSV (name, sku, category, price, stock)
- On submit: Validate all rows (show errors if any)
- If valid: Create all products, show success count
- If invalid: Show error report with row numbers + field-level errors

### Order Management** (`app/(admin)/admin/orders/`)

**Order List**
- Paginated table: Order ID, date, customer, items count, status, payment_method, payment_status, total
- Filters: Status, payment method, date range, customer name, payment status
- Sort: Date (desc), total, status
- Actions: View detail, quick actions (change status, mark paid for COD, etc.)
- Bulk actions: (Optional) Select multiple, change status

**Order Detail**
- Left panel: Order info (ID, date, status, payment info)
- Center: Items (line items with prices)
- Right panel: Customer info (name, email, phone, address)
- Actions:
  - Change status (dropdown): pending → confirmed → shipped → delivered
  - For COD: Button "Mark as Paid"
  - Refund button: Opens refund form (amount, reason)
  - Cancel button: (If not shipped)
  - Email customer button: Opens email composer
  - Download invoice button
- Timeline: Show all status changes (who, when)

### Payment Management** (`app/(admin)/admin/payments/`)

**Payment List**
- Table: Order ID, amount, method, status, attempted_at, retry_count
- Filters: Status (pending, paid, failed), method, date range
- Actions: View attempts, retry (for failed prepaid payments), refund

**Payment Attempts**
- For each failed payment: Show attempt log (timestamp, gateway response, error reason)
- If > 3 failures: Highlight "Manual review required"
- Admin can manually change payment status or trigger refund

### Customer Management** (`app/(admin)/admin/customers/`)

**Customer List**
- Table: Email, name, phone, last order date, total orders, total spent
- Search: By email, name, phone
- Actions: View detail

**Customer Detail**
- Profile: Email, name, phone, account created date
- Order history: All orders linked to this customer
- Guest orders: All orders with their email (even if no account)
- Communication history: All emails sent to customer
- Admin actions: Send email, merge guest orders (if applicable), notes

### Settings** (`app/(admin)/admin/settings/`)

**Email Settings**
- Sender name, support email, phone, website, social media links
- Save button: Updates settings table

**Service Area Settings**
- List of valid cities (initially: all Pakistan)
- Add/remove cities (admin management)
- Note: System validates delivery addresses against this list

**Inventory Settings**
- Global low-stock threshold (default: 5)
- Per-product override: Link to products page to set individual thresholds

**Tax & Fees Settings**
- Tax rate (% or fixed)
- Delivery fee (fixed or by area)
- Payment method fees: COD (%, fixed), Jazz Cash (%), Easypaisa (%)
- All fields saved to settings table, fetched at checkout

---

## 13. Service Area Management

### Implementation

**Service Area Data Model** (Initial: All of Pakistan)
```
service_areas (
  id UUID PRIMARY KEY,
  city VARCHAR UNIQUE,
  postal_code_range VARCHAR (nullable, e.g., "1000-9999"),
  is_active BOOLEAN,
  created_at TIMESTAMP
)
```

**Initial Setup**
- On first deployment: Seed `service_areas` table with all major Pakistani cities (Karachi, Lahore, Islamabad, Rawalpindi, Multan, Peshawar, Quetta, Faisalabad, Hyderabad, Gujranwala, etc.)
- All cities set to `is_active = true`
- Initial scope: **All of Pakistan serviceable**

**Admin Interface**
- List of cities with status (active/inactive)
- Disable city: Toggle active status (temporarily stop delivery there)
- Re-enable city: Restore active status
- Search: By city name
- Add new city: (Optional Phase 2) Admin can add new cities if not already in seed list

**Checkout Validation**
- User enters city + postal code
- Server Action queries `service_areas WHERE city = {city} AND is_active = true`
- If found and active: Validation passes
- If not found or inactive: Return error "Delivery not available in {city}. Please choose another address."

**Future Expansion**
- Add granular postal code ranges per city (Phase 2)
- Regional restrictions (e.g., disable Balochistan temporarily due to logistics)

---

## 14. Audit Logging

### What to Log

**Admin Mutations**
- Product create/update/delete
- Product disable/enable
- Bulk product upload (one log entry per upload batch)
- Inventory adjustment (quantity change)
- Order status change (pending → confirmed → shipped, etc.)
- Order cancellation
- Refund approval/processing
- Email send (custom email from admin)
- Settings update (tax, fees, service areas, etc.)

**Security Events**
- Admin login/logout
- Failed login attempt (+ IP address, if available)
- Password change (admin or customer)
- Account creation (customer)
- Admin account creation (by existing admin)

**Customer Account Changes** (for support/audit)
- Address added/updated/deleted
- Email changed
- Profile updated

### Logging Implementation

**Audit Log Table**
```
audit_logs (
  id UUID PRIMARY KEY,
  admin_id UUID (nullable - for customer actions),
  action VARCHAR (e.g., 'product_update', 'order_cancel', 'login_failed'),
  resource_type VARCHAR (e.g., 'product', 'order', 'admin'),
  resource_id UUID,
  details JSONB (action-specific data),
  ip_address INET,
  created_at TIMESTAMP
)
```

**Logging Helper Function (Server-side)**
```typescript
async function auditLog(action: string, resourceType: string, resourceId: string, details: object, adminId?: string) {
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address: getClientIp(), // From request headers
    created_at: new Date()
  });
}
```

**Admin Audit View** (Optional Phase 2)
- Paginated log of all audit events
- Filters: Action, resource type, date range, admin
- Detail: Shows details JSON, IP address, timestamp

---

## 15. Security Considerations

### Authentication & Authorization

**RLS Policies (Database-level Security)**
- Every table default-deny: `CREATE POLICY deny_all ON table_name AS (false)`
- Specific policies for each role:
  - Customers: Can read products, create orders (own only), read own orders
  - Admins: Can read all, create/update/delete as needed
  - Service role (server-side only): Full access for server-side operations

**Example Policy**
```sql
CREATE POLICY customer_read_own_orders ON orders
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (user_id IS NULL AND guest_token = current_token)
  );
```

**No Client-Side Secrets**
- Service role key: NEVER in `NEXT_PUBLIC_*` env vars
- Database: Only accessed via authenticated Supabase client (with user session)
- Payment gateway keys: Only in server environment
- JWT secrets: Managed by Supabase Auth (not manually)

### Payment Security

**Prices Enforced Server-Side**
- Never trust client-side price data
- At checkout: Fetch product prices fresh from DB, recalculate totals
- Compare client-submitted prices to server-calculated prices; fail if mismatch

**Payment Gateway Signing**
- Verify all webhook signatures using gateway's public key
- Store gateway credentials (merchant ID, secret) server-side only
- HTTPS always (no HTTP for payment requests)

**PCI Compliance**
- Never store card numbers (delegate to payment gateway)
- Never transmit card data through our servers (customer → gateway directly)
- Payment status only (paid/failed/pending)

### Input Validation

**Server-Side Validation (Always)**
- Even if client-side validation exists, re-validate server-side
- Use Zod or similar schema validator
- Validate: Email format, phone number format, address completeness, quantity > 0, price >= 0

**SQL Injection Prevention**
- Use parameterized queries (Supabase client handles this)
- No string interpolation in SQL

**XSS Prevention**
- Sanitize user inputs before display (next/script escapes JSX by default)
- Validate and limit user-submitted data (e.g., product descriptions)

**CSRF Protection**
- Next.js handles CSRF tokens automatically for form submissions
- Verify origin headers for API routes

### Data Privacy

**Customer Data Retention**
- Store only necessary data: Email, name, phone, address, order history
- No tracking cookies (avoid unnecessary privacy concerns)
- Provide data export/deletion options (Phase 2 feature)

**Email Privacy**
- Unsubscribe link in all marketing emails
- Logs of all emails sent (for audit)
- Failed email attempts logged, admin alerted if > 3 failures for same address

**Credentials**
- Passwords: Hashed via Better Auth (bcrypt, salted)
- Never log passwords or sensitive data
- Reset links: Expire after 30 minutes, one-time use
- Admin passwords: Minimum 8 characters, strong password requirement (per spec)

---

## 16. Testing & Verification Approach

### Testing Strategy

**Unit Tests** (Per function, <10% of test effort)
- Utility functions: Price calculations, validation helpers
- Tool: Jest + React Testing Library
- Example: `calculateTotal([item1, item2]) => expectedTotal`

**Integration Tests** (API + Database, ~30% of test effort)
- Server Actions: Test complete flow (input → DB update → response)
- RLS policies: Verify access control (customer cannot read other orders)
- Payment flow: Mock gateway responses, test state transitions
- Tool: Vitest + Supabase local testing

**E2E Tests** (Full user flows, ~20% of test effort)
- Tool: Playwright
- Scenarios:
  - Customer browsing → add to cart → checkout → order confirmation
  - Admin add product → bulk upload → inventory management
  - Payment: COD order creation → admin marks paid
  - Payment: Prepaid order → redirect to gateway → confirm payment
  - Guest checkout → create account → link past orders

**Manual Testing** (Critical paths, ~40% of test effort)
- Payment gateway flows (cannot fully mock real gateway)
- Email delivery (verify templates, formatting)
- Mobile responsiveness (4G connection simulation)
- Edge cases (double-click checkout, network interruption)

### Test Environments

**Local Development**
- Supabase local instance (via Docker)
- Seed data: 100 test products, 50 test orders, 10 test customers
- Real Next.js dev server

**Staging**
- Separate Supabase project (replicated schema)
- Real payment gateway (sandbox mode)
- Deployed Next.js build
- Run E2E tests against staging

**Production**
- Real payment gateways (live credentials)
- Production Supabase project
- Deployed Next.js build
- Monitoring + error tracking (Sentry, optional)

### Verification Checklist (Before Launch)

**Functionality**
- [ ] All spec acceptance criteria passing (50+ criteria)
- [ ] All user flows completed (customer + admin)
- [ ] All payment methods working (COD, JazzCash, Easypaisa)
- [ ] Email notifications sent correctly
- [ ] Inventory reservation working without overselling

**Security**
- [ ] RLS policies tested (customer cannot access other orders)
- [ ] Prices calculated server-side (not trusting client)
- [ ] Payment gateway signatures verified
- [ ] No secrets in client code or git
- [ ] SQL injection attempts blocked

**Performance**
- [ ] Storefront loads < 3 seconds (4G)
- [ ] Search returns results < 2 seconds (1000+ products)
- [ ] Admin dashboard loads < 2 seconds (1000+ orders)
- [ ] Order creation < 5 seconds under normal load
- [ ] Concurrent users (100+) handled without error

**Data Integrity**
- [ ] Inventory never oversold
- [ ] No duplicate orders (idempotency working)
- [ ] Payment status synced with order status
- [ ] Audit logs complete (all admin actions logged)

**Deployment**
- [ ] Migrations applied correctly (schema matches spec)
- [ ] Environment variables configured (all secrets)
- [ ] Database backups configured
- [ ] Error logging configured (Sentry, DataDog, etc.)
- [ ] CDN configured (for product images)

---

## 17. Deployment Considerations

### Infrastructure Requirements

**Compute**
- Next.js: Serverless (Vercel) or container (Docker on Render, Railway)
- Recommended: Vercel (native Next.js support, auto-scaling)
- Estimated: < $50/month for starter load

**Database**
- Supabase: Managed PostgreSQL
- Plan: Starter ($25/month) initially, scale to Pro ($110/month) at 1000+ orders/month
- Backups: Automatic daily

**Storage**
- Supabase Storage (S3-compatible) for product images
- Included in Supabase plan

**Cache/Sessions**
- Upstash Redis: Pay-as-you-go (~$1-10/month for starter load)

**Email**
- Supabase Email: Free up to 30/day, then $0.01/email
- Or SendGrid: $19-25/month for > 10k emails/month

**CDN**
- Included via Vercel (for Next.js assets)
- Supabase Storage: Includes CDN for images

### Deployment Process

**1. Prepare Staging**
```bash
# Create staging Supabase project
# Apply migrations (via SQL editor or CLI)
# Deploy Next.js to staging (Vercel branch deployment)
# Run E2E tests against staging
```

**2. Pre-Production Checklist**
- [ ] All migrations applied
- [ ] Environment variables configured
- [ ] Payment gateway credentials tested (sandbox)
- [ ] Email sending verified (test email delivered)
- [ ] Images accessible via CDN
- [ ] Backups configured
- [ ] Error tracking setup (optional)

**3. Production Deployment**
```bash
# Switch database to production Supabase project
# Deploy Next.js to production
# Run smoke tests (critical paths)
# Monitor error logs for 24 hours
```

**4. Post-Deployment**
- Monitor performance metrics (latency, error rate)
- Check payment gateway logs for failures
- Verify email delivery
- Monitor inventory levels
- Review audit logs for anomalies

### Scaling Considerations

**As Traffic Grows**
- Vercel auto-scales compute (serverless)
- Supabase Pro plan recommended at 1000+ orders/month
- Redis: Upstash auto-scales with usage
- CDN: Already included, handles image traffic

**Monitoring & Alerting** (Phase 2)
- Set up Sentry for error tracking
- CloudFlare Analytics (or similar) for traffic patterns
- Admin dashboard alerts (low stock, failed payments, system errors)

---

## 18. Decisions Finalized (All 10 Open Items Resolved)

### Applied Decisions (Per User Clarification)

**1. Product Deletion: Soft Delete** ✅
- Products are disabled (`is_active = false`), never hard-deleted
- Disabled products remain visible in order history (historical data preserved)
- Admin can re-enable products later

**2. Inventory Adjustments: Documented Reason Required** ✅
- Admin submits adjustment form with new quantity + reason dropdown
- Reasons: Damaged, Lost, Return, Physical Count, Correction, Other
- Optional notes field for additional context
- All adjustments logged in audit_logs with reason for accountability

**3. Refunds: Manual Admin Processing (Phase 1)** ✅
- Admin handles refunds manually via bank transfer, JazzCash, or Easypaisa
- Customer provides refund payment method details
- Admin processes outside system, updates order status to "refunded"
- Phase 2: Can integrate automated gateway refunds

**4. Product Recommendations: Category-based (Phase 1)** ✅
- Show 4-6 related products from same category
- Simple rule: `SELECT * FROM products WHERE category_id = current AND is_active = true ORDER BY recent_sales DESC`
- Display on product detail + cart pages
- Phase 2: Upgrade to purchase-history-based

**5. Admin Roles: Single Admin Role (Phase 1)** ✅
- All admins have full access to all features
- No granular permissions (product_manager, order_manager, etc.)
- Audit logging provides accountability per admin
- Phase 2: Implement role-based permissions if team grows

**6. Low-Stock Alerts: Dashboard + Email** ✅
- Dashboard: Red badge on low-stock items, summary count
- Email: Daily digest (9am) listing all products at/below threshold
- Alert contains: Product name, current quantity, threshold, restock link
- Per-product override: Admin can set custom threshold per product

**7. Guest Order Linking: Automatic After Email Verification** ✅
- When user registers with email previously used for guest orders
- Email verification link sent
- After verification: System automatically links past guest orders to new account
- User sees notification: "X past orders linked to your account"

**8. Payment Failure Reminders: System-Generated** ✅
- After payment fails: Immediate email to customer with retry link
- After 3 counted failures: System sends email to customer ("Contact support or order auto-cancels in 7 days")
- Admin also alerted: Email + dashboard flag with retry instructions
- Payment failure email includes: Reason, retry link, 7-day deadline

**9. Order Cancellation: Allowed Before Shipping** ✅
- Customer can cancel order if status is not "shipped" or "delivered"
- Pending/Confirmed orders: Cancellable
- Shipped/Delivered orders: Not cancellable (must use refund request)
- Cancellation is permanent; cannot un-cancel
- Customer receives cancellation email immediately

**10. Delivery Estimate: Static 2–5 Business Days (Phase 1)** ✅
- Default estimate: "2–5 business days"
- Timeline begins: After order confirmed (COD immediately, prepaid after payment succeeds)
- Display in confirmation email, order detail page, customer account
- Static for Phase 1 (no per-order or per-category customization)
- Phase 2: Can upgrade to admin-configurable per-category or per-order estimates

---

## 19. Remaining Contradictions & Unknowns

After reconciliation against spec.md and all clarifications, the plan is now **fully aligned**. No remaining contradictions or unknowns in core functionality.

**Items for Phase 2 (Explicitly Out of Scope for Phase 1)**
- SMS notifications (email only in Phase 1)
- Advanced product recommendations (purchase history ML)
- Role-based admin permissions (single role adequate for Phase 1)
- Admin-configurable delivery estimates (static 2–5 days for Phase 1)
- Automated refunds via payment gateways (manual processing Phase 1)
- A/B testing framework
- Coupon/discount codes
- Wishlist feature
- Product reviews
- Live chat support

---

## 20. Stack & Constitution Compliance Summary

### Stack Decisions Confirmed

**Core Stack**
- ✅ Next.js 14+ (App Router) — per constitution
- ✅ Supabase (PostgreSQL + RLS) — per constitution
- ✅ Better Auth (custom session management, activity-based timeout) — justified for session control
- ✅ Upstash Redis (inventory reservation + session storage) — justified for performance
- ✅ Direct payment gateway APIs (JazzCash/Easypaisa) — no external processor

**Why No Additional Dependencies**
- No Stripe/PayPal: Unnecessary for JazzCash/Easypaisa; direct API calls simpler
- No NextAuth.js: Better Auth provides finer control over session timing
- No Redux/Zustand: React Context sufficient for cart + UI state
- No recommendation engine library: Simple category-based rules adequate for Phase 1

### Constitution Adherence

**1. Stack Discipline** ✅
- Only Next.js + Supabase + Better Auth + Upstash Redis
- Each addition justified (auth control, inventory performance, session management)

**2. Supabase as Source of Truth** ✅
- All schema changes via SQL migrations (tracked in git)
- RLS policies enforce security at database level
- Audit logs stored in database (immutable record)

**3. Security-First** ✅
- RLS on every table (default-deny policies)
- Server Actions for all mutations
- Prices calculated server-side (no client trust)
- Secrets server-side only (service role, payment gateways)

**4. Simplicity** ✅
- Prefer Server Components + Server Actions
- Cart: React Context only (no complex state library)
- Email: Supabase Email initially
- Single admin role (no complex permission matrix)

**5. Reuse Before Rebuild** ✅
- Supabase: Native auth, database, storage
- Better Auth: Standard session management
- Payment gateways: Direct API (no middleware)

**6. Spec Before Code** ✅
- This plan fully addresses every spec requirement
- All edge cases covered
- Security decisions explicit and justified

---

## Next Steps for Implementation

**1. Approval Gate**
- Review this revised plan for any remaining issues
- Confirm all decisions align with your vision

**2. Database Schema Design** (Ready to proceed)
- Create complete schema based on this plan
- Define RLS policies for each table
- Create migration files for version control

**3. Project Setup** (Ready to proceed)
- Initialize Next.js project with App Router
- Set up Supabase project (local dev + staging)
- Configure Better Auth
- Set up Upstash Redis

**4. Implementation Phases**
- Phase 1A: Core auth, products, cart (foundational)
- Phase 1B: Checkout, inventory reservation, orders
- Phase 1C: Payment processing, COD + prepaid flows
- Phase 1D: Admin dashboard, email, audit logging
- Phase 2: Refinements, Phase 2 features, scaling

---

**End of Revised Implementation Plan**


### Dependencies & Risks

**External Risk: Payment Gateway Outage**
- Mitigation: Show user-friendly message, order remains "pending payment", customer can retry later
- Status Page: Monitor JazzCash/Easypaisa status pages

**External Risk: Supabase Service Degradation**
- Mitigation: RTO ~1 hour (managed by Supabase), acceptable for non-critical ecommerce
- Fallback: Manual order entry via admin (temporary)

**Technical Debt**
- No product search indexing yet (works at scale with basic LIKE queries)
- No A/B testing framework (Phase 2 feature)
- No recommendation engine ML (Phase 2 feature)
- No inventory forecasting (Phase 2 feature)

---

## 19. Why This Plan Fits Your Constitution

### Stack Discipline ✅
- **Only** Next.js (App Router) + Supabase (no Rails, Django, Express)
- **Only** Upstash Redis added (justified: performance for inventory reservation + session management)
- Email via Supabase (no external dependency initially)
- All payments: Direct API calls (no Stripe/PayPal middleman)

### Supabase as Source of Truth ✅
- All schema changes via SQL migrations (tracked in git, not dashboard edits)
- RLS policies define security (not application-layer checks alone)
- Audit logs stored in database (immutable record)

### Security-First ✅
- RLS on every table (default-deny policies)
- Server Actions for all mutations (no client-side price manipulation)
- Secrets: Service role key, payment gateway creds stay server-side only
- Server-side input validation (even if client validates first)

### Simplicity ✅
- Prefer Server Components + Server Actions over complex client state
- Cart: Simple React Context, not Redux/Zustand
- Email: Supabase Email (no external vendor initially)
- One admin role, not complex permission matrix (Phase 2 if needed)

### Reuse Before Rebuild ✅
- Supabase Auth: Use native JWT/session, don't build custom auth
- Database: Leverage Supabase RLS, don't application-layer auth
- Payments: Direct gateway APIs (simple, no middleware library needed)

### Spec Before Code ✅
- This plan fully addresses every requirement in spec.md
- All edge cases covered (out-of-stock, payment failures, etc.)
- Security decisions justified (RLS, server-side validation, etc.)
- Trade-offs explicit (what's Phase 1 vs. Phase 2)

---

## 20. Next Steps for Approval

**Please review and confirm:**

1. **Stack decisions**: Next.js + Supabase + Upstash Redis acceptable?
2. **Payment integration**: Direct API calls to JazzCash/Easypaisa acceptable (no third-party payment processor)?
3. **Email service**: Supabase Email for Phase 1, migrate to SendGrid if needed?
4. **Data model**: Inventory tracking via `product_inventory` table with `reserved` column?
5. **Open decisions** (Section 18): Any clarifications needed on the 10 unknowns?
6. **Admin roles**: Single "admin" role sufficient, or need granular permissions?
7. **Timeline expectations**: Any aggressive deadline constraints this plan should account for?

**Once approved**, next phase:
- Finalize database schema (based on data model sketches above)
- Set up Supabase project + local development environment
- Begin implementation (following this plan chapter-by-chapter)

---

**End of Implementation Plan**
