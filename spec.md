# Specification: Muskan Care Center E-Commerce Store

## Goal

Enable customers to browse, select, and purchase personal hygiene products online with a streamlined experience optimized for Pakistan's market. Provide store administrators with tools to manage inventory, process orders, track payments, and communicate with customers via email.

The store operates on a cash-on-delivery (COD), JazzCash, and Easypaisa payment model, targeting 1000s of products with 100s of daily orders. The experience must work reliably on mobile networks common in Pakistan and handle payment failures gracefully.

---

## User Scenarios

### Customer Journey

1. **Discovery & Browsing**
   - Customer visits store, sees homepage with featured products and categories
   - Browses categories (e.g., soaps, shampoos, skincare) to find products
   - Searches products by name or keyword
   - Filters results (e.g., by price range, rating, availability)
   - Views product details (description, images, price, variants, in-stock status)
   - Sees related and recommended products on product pages

2. **Shopping & Checkout**
   - Adds products to cart (with quantity selection)
   - Views cart summary, adjusts quantities, removes items
   - Can save cart and return later without authentication
   - At checkout: creates account or logs in (or checks out as guest)
   - Provides delivery address (within Pakistan only)
   - Selects payment method (COD, JazzCash, Easypaisa)
   - Reviews order summary before final submission
   - Receives order confirmation (immediately and via email)

3. **Special Purchases**
   - Sees bundle offers (e.g., "buy 3 shampoos, get 20% off")
   - Bundle pricing displays correctly during selection and at checkout
   - Cannot break a bundle — either accepts the full bundle or excludes it

4. **Post-Purchase**
   - Can view order status (pending, confirmed, shipped, delivered, cancelled)
   - Can view payment status (pending, paid, failed, refunded)
   - Receives email notifications when order status or payment status changes
   - Can download or view invoice
   - Can cancel orders (if not yet shipped)
   - Can request refund (system marks order as refund-pending, admin handles approval)

5. **Account Management**
   - Customer logs in to view profile, past orders, saved addresses
   - Can manage multiple delivery addresses
   - Can update contact information (name, email, phone)
   - Can view order history with filters (by date, status)
   - Can track current orders in real time

### Admin Journey

1. **Dashboard Overview**
   - Admin logs in to dashboard
   - Sees key metrics: today's orders, pending payments, failed payments, inventory alerts
   - Quick access to products, orders, customers, settings

2. **Product Management**
   - Can add new products (name, description, images, price, SKU, categories, tags)
   - Can edit existing products (update price, description, images, availability)
   - Can manage product variants (e.g., size S/M/L for the same product)
   - Can organize products into categories and subcategories
   - Can enable/disable products without deleting
   - Can upload bulk product data
   - Can view product performance (sales count, revenue, stock level)

3. **Inventory Management**
   - Can set stock levels per product/variant
   - Receives alerts when stock falls below threshold (e.g., 5 units)
   - Can see real-time stock depletion during checkout
   - Can mark product as out-of-stock (prevents new orders)

4. **Order Management**
   - Views all orders in a list (sortable, filterable by status, date, customer, payment method)
   - Opens order detail: sees customer info, items, total, payment method, delivery address
   - Can change order status: pending → confirmed → shipped → delivered
   - Can cancel orders (if not already shipped); system notifies customer via email
   - Can see payment status for each order
   - Can mark COD orders as paid (when cash is received)
   - Can manually refund orders; system tracks refund status and notifies customer

5. **Payment Management**
   - Views payment transactions filtered by status (pending, successful, failed)
   - Can see retry history for failed payments
   - For JazzCash/Easypaisa: sees payment gateway responses and failure reasons
   - For COD: tracks which payments are pending cash collection

6. **Customer Communication**
   - Can send custom email to customer from order detail page
   - Sees email delivery status (sent, failed, bounced)
   - Can view email history for each customer

7. **Reporting & Insights**
   - Can export order list (with customer, payment, shipping info) to CSV
   - Can view sales summary by date range, category, or product
   - Can see payment method breakdown (% COD vs JazzCash vs Easypaisa)

---

## Functional Requirements

### 1. Product Catalog & Discovery

**Customer-facing:**
- Products display with: name, main image, price (in PKR), availability status, average rating
- Product details page shows: full description, all images/gallery, price, all variants, in-stock indicator, related products, customer reviews (if any)
- Product categories are browsable (hierarchical: parent → child categories)
- Search returns products matching name, description, or SKU; results are paginated
- Filters work independently and stack (e.g., category + price range + availability)
- Pricing is displayed clearly; discounts (if any) show original and sale price
- Variants (if any) are selectable; price updates if variant has different cost
- Out-of-stock products show clearly but remain viewable; "Notify Me" option available (optional scope — see Out-of-Scope)
- Product recommendations appear on product detail pages and cart page (based on category or purchase history)

**Admin-facing:**
- Admin can create products with SKU, name, description, category, images, price, initial stock
- Admin can edit any product field and see changes reflected immediately in storefront
- Admin can mark products as active/inactive; inactive products are hidden from customers
- Admin can bulk upload products via CSV (name, SKU, category, price, stock)
- Admin can view product-level sales metrics (units sold, revenue, stock remaining)

**System behavior:**
- Product availability is checked real-time during checkout; if stock is insufficient, checkout fails with explanation
- Pricing is consistent across all pages (no stale prices cached on client)
- Product images load correctly on mobile and desktop
- Search is case-insensitive and matches partial names (e.g., "soap" matches "Body Soap")

---

### 2. Shopping Cart

**Customer-facing:**
- Customer can add any product (with quantity) to cart without authentication
- Cart persists across browser sessions (customer can close/reopen browser and find items still there)
- Cart shows: item list with name, image, quantity, unit price, line total, grand total
- Customer can change quantity (increase/decrease) or remove items
- Cart updates instantly when customer changes quantity or removes items
- If product price changes after being added to cart, customer sees the new price before checkout
- If product becomes out-of-stock after being added to cart, customer is warned during checkout
- Subtotal and any taxes/fees are displayed before checkout
- Cart is cleared after successful order

**System behavior:**
- Cart data is stored and synced with backend; cart is recoverable if session is lost
- Cart enforces maximum quantities per item (if business rule applies)
- Cart respects bundle rules: if a bundle is added, all bundle items are added together; cannot partially select a bundle

---

### 3. Bundle Offers

**Customer-facing:**
- Bundles are displayed as special offers with clear visual indication (badge, highlight)
- Bundle description shows: items included, regular total price, bundle price, discount amount or percentage
- Customer adds entire bundle to cart at once; cannot select individual items from a bundle separately
- Bundle pricing is locked at purchase time; if bundle price changes after being added to cart, old price applies
- If a bundle item becomes out-of-stock, bundle offer is disabled (customer cannot add it); if it becomes out-of-stock after being added to cart, checkout fails with explanation

**Admin-facing:**
- Admin can create bundles (select products, set bundle price, set active/inactive dates)
- Admin can edit bundle content and pricing
- Admin can see bundle sales separately from individual product sales

**System behavior:**
- Bundle pricing is enforced server-side; no way for customer to manipulate bundle price client-side
- Bundles cannot contain other bundles (no nesting)

---

### 4. Checkout Process

**Customer-facing:**
- Checkout is a multi-step flow: cart review → address & payment method → order confirmation
- Step 1 - Cart Review: customer sees all items, can adjust quantities or remove items before proceeding
- Step 2 - Delivery Address:
  - If customer is logged in: shows saved addresses, can select one or add new
  - If customer is not logged in: must provide address (name, phone, complete address within Pakistan)
  - Address must include: recipient name, phone number, street address, city, postal code
  - System validates that address is within Pakistan (city/postal code exist)
  - Multiple addresses can be saved for logged-in customers
- Step 3 - Payment Method:
  - Customer selects payment method: COD, JazzCash, or Easypaisa
  - For COD: no additional fields; order is confirmed immediately pending payment on delivery
  - For JazzCash/Easypaisa: customer is redirected to payment gateway after order is created
  - Order is created in "pending payment" state; only transitions to "confirmed" after payment succeeds
- Step 4 - Review & Submit:
  - Customer sees order summary: items, quantities, prices, delivery address, payment method, total
  - Customer submits order
  - If any item is out-of-stock at this moment, checkout fails; customer is returned to cart with explanation
- Post-Submission:
  - Customer sees confirmation message on screen immediately
  - Confirmation email is sent (see Email section)
  - For COD: order is immediately confirmed; customer can proceed to account
  - For JazzCash/Easypaisa: customer completes payment and is returned to confirmation page

**Authentication during checkout:**
- Customer can check out as guest (no account required)
- Customer can create account during checkout (email, password)
- Customer can log in during checkout if they have an account

**System behavior:**
- Checkout session has a timeout (e.g., 30 minutes); if customer abandons checkout, session expires and cart is preserved but checkout state is cleared
- Order IDs are unique and non-sequential (unpredictable)
- Inventory is reserved/locked during checkout to prevent double-selling; if checkout is abandoned, inventory is released after timeout
- Duplicate order detection: if customer submits the same order twice within 60 seconds (accidental double-click or network retry), only one order is created
- All prices, taxes, and totals are calculated server-side; no client-side price manipulation is possible

---

### 5. Payment Processing

**Cash on Delivery (COD):**
- Order is created in "confirmed" state immediately after checkout
- No payment gateway interaction
- Admin marks order as "paid" when cash is received
- System sends "order confirmed" email to customer

**JazzCash & Easypaisa:**
- After customer selects payment method and provides address, order is created in "pending payment" state
- Customer is redirected to payment gateway (JazzCash/Easypaisa) with order details (amount, merchant account, reference)
- If payment succeeds: payment gateway redirects to confirmation page, order status changes to "confirmed", customer receives confirmation email
- If payment fails or customer cancels: payment gateway redirects to failure page, order status remains "pending payment", customer can retry payment or abandon order
- If payment gateway is unreachable: system shows error message, order remains "pending payment" so customer can retry later
- System automatically retries failed webhook notifications (if payment gateway sends async confirmation)
- Payment status and order status are kept in sync; if payment changes, order status updates automatically

**Payment Failure Handling:**
- Failed payments do NOT create multiple orders; customer can retry with the same order ID
- If payment fails, customer can retry immediately or later (order link remains valid)
- After N failed payment attempts (e.g., 3), admin is alerted
- Overdue pending payments (unpaid after 7 days) are flagged in admin dashboard

**Payment Status Tracking:**
- Order status: pending → confirmed → shipped → delivered (or cancelled)
- Payment status: pending → paid (or failed → pending, if retried)
- Status mismatch detection: if order is confirmed but payment shows failed (or vice versa), admin is alerted
- All payment status changes are logged with timestamp and reason

---

### 6. Order Management

**Customer-facing:**
- Customer can view all their past orders in account page
- Order list shows: order ID, date, status, payment method, total, quick action links
- Customer can view order detail: items ordered, quantities, prices, delivery address, payment method, current status, payment status, tracking info (if shipped)
- Customer can cancel order if not yet shipped; system shows a confirmation dialog; once confirmed, order status changes to "cancelled" and customer receives cancellation email
- Cancelled orders cannot be un-cancelled but can be reordered by adding items manually again
- Customer can request refund for delivered order; system changes status to "refund requested" and admin must approve/process

**Admin-facing:**
- Admin views all orders in a list with filters: status (all, pending, confirmed, shipped, delivered, cancelled), payment method (all, COD, JazzCash, Easypaisa), date range, customer name, payment status
- Admin can sort by: date, status, total, customer name
- Admin can open order detail: sees all information (items, address, payment method, current status, payment status, customer contact info)
- Admin can change order status manually: pending → confirmed → shipped → delivered
- For COD orders: admin can mark payment as "received" (changes payment status to "paid")
- For JazzCash/Easypaisa orders: payment status changes automatically based on gateway response
- Admin can cancel orders (up until they are shipped); cancellation sends email to customer
- Admin can manually refund orders; system changes status to "refunded" and logs who refunded and when
- Admin can see order history and all status transitions with timestamps

**System behavior:**
- Order status is never changed by customer (admin only, or system in response to payment)
- Order ID is unique and serves as customer's reference; customer receives it in confirmation email
- Once order is marked "shipped", delivery address and items cannot be changed
- Refunds are tracked separately (order status, refund amount, refund date, who approved)

---

### 7. Customer Authentication & Account Management

**Registration & Login:**
- Customer can create account with: email, password, name (optional)
- Email must be unique; system rejects duplicate registrations
- Password must meet minimum strength (e.g., 8 characters, at least one number)
- Customer can log in with email and password
- Forgotten password: customer can request reset; system sends reset link via email; link expires after 30 minutes; customer sets new password
- Session expires after inactivity (e.g., 2 weeks); customer must log in again
- Logout clears session and returns to homepage

**Account Page:**
- Shows customer name, email, phone (if provided)
- Shows list of saved delivery addresses with option to add, edit, or delete
- Shows order history with links to order details
- Option to update profile information
- Option to change password
- Option to delete account (optional scope — see Out-of-Scope)

**Account Security:**
- Passwords are not stored in plain text (hashed server-side)
- User sessions are validated on every protected page; session ID is httpOnly and secure
- Admin cannot access customer accounts without explicit admin authentication
- All account changes are logged (for audit purposes, visible to admin)

---

### 8. Admin Panel & Authentication

**Admin Login:**
- Admin creates account (done once, setup phase) with email and strong password
- Admin logs in with email and password
- Admin session times out after inactivity (e.g., 1 hour); must log in again
- Admin can change their own password

**Admin Access Control:**
- Admin role is assigned during account creation (not selectable by user)
- Only authenticated admins can access admin dashboard and tools
- Attempting to access admin pages without authentication redirects to login
- Admin cannot act as customer (separate authentication)
- All admin actions are logged: who, what, when (for audit trail)

**Dashboard:**
- Shows key metrics: today's total orders, today's revenue, pending orders, failed payments, inventory alerts
- Shows graphs (if helpful): orders by day/week, payment method breakdown
- Quick links: add product, view pending orders, manage inventory, view failed payments

---

### 9. Email Notifications

**Triggered automatically:**

1. **Order Confirmation**
   - Sent to customer immediately after order is created
   - Contains: order ID, items ordered, delivery address, expected delivery date (if applicable), payment method
   - For COD: states "awaiting payment on delivery"
   - For JazzCash/Easypaisa: states "payment pending" with payment status

2. **Payment Confirmation** (JazzCash/Easypaisa only)
   - Sent to customer after successful payment
   - Contains: order ID, payment reference, amount paid, timestamp

3. **Payment Failure Alert** (JazzCash/Easypaisa only)
   - Sent to customer after payment fails
   - Contains: order ID, reason for failure, link to retry payment, support contact

4. **Order Status Updates**
   - Sent when order status changes: confirmed, shipped, delivered
   - Contains: new status, order ID, tracking info (if applicable)

5. **Order Cancellation**
   - Sent to customer when order is cancelled (by customer or admin)
   - Contains: order ID, reason (optional), refund status (if applicable)

6. **Refund Notification**
   - Sent when refund is processed
   - Contains: order ID, refund amount, refund method, expected timeline

**Admin-triggered:**
- Admin can send custom email to customer from order detail page
- Email includes: admin's message, order context (order ID shown in email)

**Email Delivery:**
- All emails include: Muskan Care Center name, contact information, unsubscribe link (if applicable)
- Email is sent from verified sender (e.g., orders@muskancare.com)
- System tracks email delivery status: sent, failed, bounced
- If email fails to send, system retries (up to 3 times over 24 hours)
- If all retries fail, admin is alerted; customer can request email to be resent

---

### 10. Reporting & Admin Insights

**Order Reports:**
- Admin can export orders to CSV: date range, filters (status, payment method, customer)
- Exported CSV includes: order ID, date, customer name, email, phone, items (list), quantity, total price, payment method, payment status, delivery address, order status

**Sales Metrics:**
- Admin can view: total revenue (by date range), orders count, average order value
- Breakdown by payment method: % COD, % JazzCash, % Easypaisa
- Breakdown by category: revenue and orders by product category

**Payment Analytics:**
- Admin can see failed payment count and reasons
- Admin can track payment success rate by method
- Admin can see which payment methods have highest failure rates

---

## Edge Cases & Rules

### Out-of-Stock & Availability

1. **Product goes out-of-stock after being added to cart:**
   - If customer hasn't checked out yet: warning shown in cart; customer can remove or keep item
   - If customer is in checkout and stock is insufficient: checkout fails with message "X units not available"; customer is returned to cart with item still there
   - System prevents order from being created if stock is insufficient

2. **Product becomes unavailable during checkout (disabled by admin):**
   - Checkout fails; customer is notified that product is no longer available
   - Stock reservation is released; customer is returned to cart

3. **All units of product are reserved by other customers during checkout:**
   - This is caught by final inventory check; checkout fails
   - Inventory reservation system prevents overselling

4. **Bundle item becomes out-of-stock:**
   - Bundle offer is hidden from storefront
   - If customer already has bundle in cart, checkout will fail if item is still out-of-stock

### Payment Failures & Retries

1. **Payment gateway is unreachable:**
   - Customer sees: "Payment gateway is currently unavailable. Your order has been created and you can retry payment later."
   - Order remains in "pending payment" state
   - Order ID is shown to customer; they can use it to retry

2. **Payment fails (declined card, insufficient funds, etc.):**
   - Payment gateway returns error reason
   - Customer is shown: error reason and link to retry payment
   - Same order ID is used for retry; no new order is created
   - Order remains "pending payment"

3. **Customer abandons checkout (leaves before submitting order):**
   - Cart is preserved; no order is created
   - Inventory reservation expires after 30 minutes; products become available again

4. **Double-click on "Place Order" button:**
   - First request creates order, second is detected as duplicate
   - Only one order is created; second request returns same order ID
   - Customer is shown confirmation for the first order

5. **Payment gateway sends late webhook (hours after initial response):**
   - System checks if order is already marked as paid
   - If yes, duplicate webhook is ignored
   - If no, order is updated and customer is notified

### Order & Payment Status Mismatches

1. **Order is confirmed but payment shows failed:**
   - Admin is alerted (dashboard flag or email)
   - For COD: this is normal (order confirmed, waiting for cash)
   - For JazzCash/Easypaisa: this indicates an issue; admin investigates

2. **Order is still pending but payment shows paid:**
   - Admin is alerted
   - Order should be manually confirmed by admin

3. **Multiple payment attempts for same order:**
   - Latest payment status is the one that matters
   - Order status updates to reflect latest payment
   - All payment attempts are logged

### Duplicate Orders

1. **Same order submitted twice within 60 seconds:**
   - Idempotency key (based on cart contents + customer + timestamp) detects duplicate
   - Only one order is created; second submission returns first order ID

2. **Different COD orders with identical addresses submitted moments apart:**
   - Both orders are created (they are different); no deduplication needed
   - System does not treat them as duplicates

### Inventory During Checkout

1. **Product price changes while customer is in checkout:**
   - Old price is shown in checkout
   - New price applies if order is created
   - This is acceptable; customer sees updated price before final submission
   - For bundles: bundle price is locked at the time of "add to cart"

2. **Product variants change while customer is checking out:**
   - If variant is removed (e.g., size M no longer available), checkout fails with explanation
   - Customer is returned to cart

3. **Inventory counter goes negative (should never happen):**
   - System prevents this; order is rejected if insufficient stock
   - If it happens due to bug, admin is alerted; issue is investigated

### Cash on Delivery (COD)

1. **Admin marks COD order as "received" before customer receives it:**
   - Order status is "shipped" or "delivered"
   - Admin manually changes payment status to "paid"
   - System allows this (admin discretion)
   - No automatic reconciliation is performed

2. **Customer receives order but refuses to pay:**
   - Admin marks order as "cancelled" or "refund pending"
   - Product is manually restocked by admin
   - Customer support handles case

3. **Delivery fails for COD order (customer not available, address unreachable):**
   - Logistics partner notifies (outside system)
   - Admin updates order status to reflect issue
   - Customer is notified via email

### Customer Information & Validation

1. **Customer provides invalid phone number:**
   - System validates format (should be valid Pakistan mobile: 03xx-xxxxxxx or similar)
   - If invalid, checkout fails with message to correct phone number

2. **Customer provides address in city not serviced:**
   - System checks city against service area (Pakistan only)
   - If not serviced, checkout fails; customer must choose different address
   - Admin can expand service area by updating city list

3. **Customer's email is undeliverable (bounces):**
   - System logs bounce
   - After 3 bounces, email address is marked as invalid
   - Admin is alerted; customer support can follow up

4. **Customer account is deleted but has pending orders:**
   - Account deletion is prevented if customer has unpaid or undelivered orders
   - Only completed orders can be kept or deleted (customer choice)

### Mobile & Network Interruptions

1. **Checkout timeout (customer's connection interrupted mid-checkout):**
   - Cart is preserved on server
   - Customer can close app/browser and return to complete checkout
   - Checkout session has 30-minute window

2. **Payment gateway callback doesn't arrive (network issue):**
   - Payment is processed on gateway side but confirmation is lost
   - System retries webhook every 5 minutes for up to 24 hours
   - Admin can manually check payment status and update order if needed

3. **Customer's internet drops during order submission:**
   - Request to create order may or may not have been received
   - System returns 504 (gateway timeout) to customer
   - Customer can retry; deduplication prevents double order

4. **Mobile app navigates away from checkout:**
   - Session is preserved
   - Cart is saved
   - Customer can return to checkout later

### Refunds & Cancellations

1. **Customer cancels order after shipping:**
   - Not allowed; system prevents cancellation
   - Customer can request refund instead (sent to admin for approval)

2. **Customer requests refund for delivered order:**
   - Order status changes to "refund requested"
   - Admin reviews and approves/denies
   - If approved: refund is processed, order status becomes "refunded", email sent to customer
   - If denied: order status returns to "delivered", customer is notified

3. **Refund is approved but customer's original payment method no longer exists:**
   - Refund is issued to customer's bank account registered with payment gateway
   - Timeline: typically 3-5 business days
   - Customer is notified of timeline in email

4. **Admin cancels order; customer has already received product:**
   - Order is marked "cancelled", customer is notified
   - No inventory adjustment is made (product is not returned)
   - Manual handling required

### Security & Unauthorized Access

1. **Customer tries to access another customer's order:**
   - System checks if accessing customer matches order owner
   - Access is denied; 403 Forbidden response
   - Incident is logged

2. **Admin tries to access another admin's account:**
   - Admin authentication is individual
   - One admin cannot impersonate another
   - All admin actions are logged (who did what, when)

3. **Unauthenticated user tries to access admin panel:**
   - Redirected to login page
   - No information is leaked about whether email exists

4. **SQL injection attempt in search field:**
   - Input is sanitized server-side
   - No database queries are affected
   - Attempt is logged

5. **Admin API key is compromised:**
   - (Outside scope for now, but flagged for future security hardening)

---

## Out-of-Scope

The following are NOT included in this specification and will be addressed in future phases or are explicitly descoped:

- Wishlist/favorites feature (customer can save products for later)
- Product reviews/ratings (display, submission, moderation)
- Coupon/discount codes (system-wide promos or individual codes)
- Loyalty programs or customer points
- Subscription/recurring orders
- Multi-vendor or marketplace functionality (single vendor only)
- Advanced analytics (Google Analytics integration, heat maps, etc.)
- SMS notifications (email only for now)
- Live chat or customer support chat
- Account deletion with data removal (customers can be archived but not deleted if they have orders)
- Shipping cost calculation (single flat rate or free shipping; not dynamic)
- Address autocomplete (customer types manually)
- "Notify Me" when out-of-stock product is back in stock
- Inventory sync with external warehouse systems
- Gift cards or store credit
- Multiple currencies (PKR only)
- International shipping
- Return/RMA management (refunds only)
- Seasonal sales/flash sales
- Product recommendations via AI (use simple rule-based recommendations instead)
- Abandoned cart recovery emails
- Admin access to customer login credentials (reset only)
- Admin impersonation of customer
- A/B testing framework

---

## Acceptance Criteria

### Browsing & Discovery

- [ ] Customer can browse all product categories without filtering; list shows at least 20 products per page
- [ ] Search for "soap" returns all products with "soap" in name or description within 2 seconds
- [ ] Product detail page displays: name, description, price, stock status, images (all), related products, and variants (if any)
- [ ] Filtering by price range (e.g., 100-500 PKR) returns only products within that range
- [ ] Product availability is marked clearly: "In Stock", "Out of Stock", or "Limited Stock (X left)"
- [ ] Recommended products appear on product detail and cart pages; recommendations are different from current product

### Cart & Checkout

- [ ] Customer can add 10 different products to cart; cart shows all 10 items with correct prices
- [ ] Removing an item from cart updates the total and removes it from display instantly
- [ ] Changing quantity of an item updates price and total without requiring page reload
- [ ] Cart persists after closing browser; reopening browser shows same cart
- [ ] Checkout requires valid delivery address (name, phone, street, city, postal code)
- [ ] Phone number validation rejects invalid format; accepts valid Pakistan mobile numbers (03xx-xxxxxxx)
- [ ] Address validation rejects addresses outside Pakistan (cities not in service area)
- [ ] Order review page shows correct subtotal, taxes (if any), and grand total before submission
- [ ] Pressing "Place Order" twice within 5 seconds creates only one order; second attempt shows same order ID
- [ ] After successful order, customer sees confirmation message and receives confirmation email within 2 minutes

### Bundle Offers

- [ ] Bundle is shown with badge "Special Offer" and displays savings (e.g., "Save 20%")
- [ ] Adding bundle to cart shows all items in bundle; customer cannot remove individual items from a bundle in cart
- [ ] Bundle price is locked at add-to-cart time; price changes after that do not affect existing cart bundle
- [ ] If bundle item becomes out-of-stock, customer cannot add new bundles to cart (existing bundles remain)
- [ ] Checkout fails with clear message if bundle item is out-of-stock at order time

### Payments - COD

- [ ] Customer selects "Cash on Delivery" at checkout
- [ ] Order is created immediately in "confirmed" status
- [ ] Customer receives confirmation email saying "awaiting payment on delivery"
- [ ] Admin can mark order payment as "paid" in dashboard
- [ ] After admin marks paid, order payment status shows "paid" in customer account

### Payments - JazzCash/Easypaisa

- [ ] Customer selects JazzCash or Easypaisa at checkout
- [ ] Order is created in "pending payment" state
- [ ] Customer is redirected to payment gateway
- [ ] Successful payment redirects customer to confirmation page; order status becomes "confirmed"; confirmation email sent within 2 minutes
- [ ] Failed payment redirects to failure page; order remains "pending payment"; customer can retry with same order ID
- [ ] If payment gateway is unreachable, customer sees error message but order is created with "pending payment" status; customer can retry later
- [ ] After 3 failed payment attempts, admin is alerted (dashboard flag or email)
- [ ] Order unpaid for 7+ days appears in admin dashboard as "overdue pending"

### Order Management

- [ ] Customer can view all past orders in account page with pagination
- [ ] Order detail shows: items, quantities, prices, address, payment method, current status, payment status
- [ ] Customer can cancel order if status is not "shipped" or "delivered"; cancellation sends email
- [ ] Admin can change order status from pending → confirmed → shipped → delivered
- [ ] Changing order status to "shipped" sends email to customer with tracking info (if available)
- [ ] Changing order status to "delivered" sends email to customer
- [ ] Admin can cancel unpaid orders; cancellation sends email to customer
- [ ] Admin can manually mark COD payment as "received" for confirmed order
- [ ] Admin can refund order (completed or in-progress); system marks as "refunded" and sends email
- [ ] Admin can view orders filtered by: status, payment method, date range, customer name
- [ ] Exporting orders to CSV includes all order details and can be opened in Excel

### Customer Accounts

- [ ] Customer can register with email and password; email must be unique
- [ ] Password validation rejects passwords under 8 characters
- [ ] Customer can log in with email and password
- [ ] Forgotten password: customer receives reset email with link expiring in 30 minutes; can set new password
- [ ] Logged-in customer can save multiple delivery addresses
- [ ] Customer can edit saved address; changes apply to future orders only
- [ ] Customer can change password from account page
- [ ] Customer can view profile information (name, email, phone)
- [ ] Session timeout: customer logged out after 2 weeks of inactivity; must log in again

### Admin Panel

- [ ] Admin logs in with email and password; session expires after 1 hour of inactivity
- [ ] Dashboard displays: today's orders count, today's revenue, pending orders count, failed payments count, low stock alerts
- [ ] Admin can add new product: name, description, price, category, images, stock level; product appears in storefront within 1 minute
- [ ] Admin can edit product (name, price, description, images, stock); changes appear in storefront within 1 minute
- [ ] Admin can bulk upload 100 products via CSV in under 5 minutes
- [ ] Admin can disable product (marked inactive); inactive product not shown to customers
- [ ] Inventory alert: admin is notified when stock falls below threshold (5 units) for any product
- [ ] Admin can access all orders, filter, sort, and export to CSV in under 30 seconds
- [ ] Admin can view customer details, past orders, and communication history
- [ ] All admin actions are logged (user, action, timestamp) and auditable

### Email Notifications

- [ ] Order confirmation email sent within 2 minutes of order creation; includes order ID, items, address, expected delivery date
- [ ] Order status update email sent when status changes; includes new status and order ID
- [ ] Payment confirmation email sent within 2 minutes of successful payment (JazzCash/Easypaisa); includes payment reference
- [ ] Payment failure email sent immediately after payment fails; includes reason and retry link
- [ ] Cancellation email sent immediately after order is cancelled; includes order ID and reason
- [ ] Refund notification email sent within 2 minutes after refund is approved; includes refund amount and timeline
- [ ] All emails display Muskan Care Center branding, contact info, and unsubscribe link
- [ ] If email fails to send, system retries up to 3 times over 24 hours
- [ ] Admin can view email delivery status (sent, failed, bounced) for each order

### Security & Validation

- [ ] Customer cannot access another customer's order or account information (403 Forbidden)
- [ ] Admin cannot access customer passwords; password reset only
- [ ] All user inputs are validated server-side (no client-side validation is trusted)
- [ ] Prices are calculated and enforced server-side; customer cannot change prices via client
- [ ] Order IDs are non-sequential and unpredictable
- [ ] Cart inventory is reserved during checkout; same item cannot be oversold
- [ ] All admin actions are logged with admin ID, action, and timestamp

### Edge Cases - Failures & Recovery

- [ ] If checkout times out, customer can close browser/app and return to complete order within 30 minutes
- [ ] If payment gateway callback doesn't arrive within 1 hour, system retries webhook automatically; order is not duplicated
- [ ] If product becomes out-of-stock during checkout, order is rejected; cart is preserved; customer is notified
- [ ] If admin tries to mark COD order paid multiple times, system handles it gracefully (no duplicate payment records)
- [ ] If order is marked "delivered" but later found to be returned by delivery partner, admin can reopen/cancel manually
- [ ] If customer's email is invalid and confirmation bounces, system logs bounce; after 3 bounces, email is marked bad
- [ ] Accessing admin panel without authentication redirects to login; no information is leaked
- [ ] SQL injection attempt in search field returns no results; attempt is logged; no database is compromised

### Performance & Reliability

- [ ] Storefront loads in under 3 seconds on 4G mobile connection
- [ ] Search returns results in under 2 seconds for queries against 1000+ products
- [ ] Admin dashboard loads in under 2 seconds with 1000+ orders in database
- [ ] System handles 100 concurrent users browsing without degradation
- [ ] Order creation succeeds in under 5 seconds under normal load
- [ ] Email notifications are sent within 2 minutes of trigger event (99% of the time)
- [ ] No data loss on payment gateway network interruption; order and payment state is consistent

---

## Summary

This specification defines a complete e-commerce experience for Muskan Care Center's personal hygiene product store. Customers can browse, search, filter products, manage carts, select payment methods, and track orders. Admins manage products, inventory, orders, payments, and customer communications. The system prioritizes reliability and correctness for payment processing in Pakistan's market, with clear handling of edge cases and payment failures.
