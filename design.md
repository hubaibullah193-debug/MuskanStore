# Design System: Muskan Care Center E-Commerce Store

/* Hallmark · macrostructure: Marquee Hero · tone: professional + cleanliness · anchor hue: forest-green */
/* theme: Studio · nav: N1b · footer: Ft2 · enrichment: E1 typography · genre: editorial */

---

## Design Direction

**Brand Promise:** Professional, trustworthy personal hygiene shopping made simple for Pakistani customers.

**Design Philosophy:**
- **Trust-first:** Clear pricing, stock status, payment methods upfront
- **Cleanliness visual language:** Whitespace, mint/forest accents, no clutter
- **Mobile-optimized:** 4G-conscious, fast-loading, minimal friction
- **Inclusive:** Accessible typography, high contrast, keyboard navigation

**Target Audience:** Cost-conscious mobile shoppers 18–45, Pakistan, mixed tech comfort, shopping in bursts on 4G

---

## Design System

### Color Tokens

```css
:root {
  /* Paper (background) */
  --color-paper: oklch(92% 0.02 90);        /* Cream white */
  --color-paper-2: oklch(88% 0.015 90);     /* Soft off-white */
  --color-paper-3: oklch(95% 0.01 90);      /* Brightest white */
  
  /* Accent (primary interaction) */
  --color-accent: oklch(44% 0.15 142);      /* Forest green */
  --color-accent-dark: oklch(38% 0.15 142); /* Darker green (hover) */
  --color-accent-light: oklch(52% 0.12 142);/* Lighter green (disabled) */
  
  /* Text */
  --color-text: oklch(15% 0.02 90);         /* Near black */
  --color-text-secondary: oklch(45% 0.02 90); /* Warm mid-grey */
  --color-text-tertiary: oklch(65% 0.015 90); /* Light grey */
  
  /* Semantic */
  --color-success: oklch(50% 0.15 142);     /* Green */
  --color-error: oklch(50% 0.16 25);        /* Warm red */
  --color-warning: oklch(65% 0.15 60);      /* Amber */
  --color-info: oklch(55% 0.12 250);        /* Cool blue */
  
  /* Borders & dividers */
  --color-border: oklch(80% 0.01 90);       /* Light grey */
  --color-border-strong: oklch(70% 0.02 90);/* Medium grey */
}
```

### Typography

**Display Font:** Lora (serif, professional, trustworthy)
- Headlines, product names, hero text
- Weight 700: Hero headlines, major page titles
- Weight 600: Section headers, emphasis
- Weight 400: Body text in display contexts

**Body Font:** Inter (grotesk sans, modern, readable on mobile)
- Body copy, labels, UI text, forms, navigation
- Weight 600: Buttons, product names, important UI labels, navigation items
- Weight 500: Secondary labels, navigation, form hints
- Weight 400: Body copy, default text, tertiary labels

**Mono Font:** Courier Prime (for prices, order IDs, technical info)
- Order confirmations, payment details, product SKUs
- Weight 400: All uses

**Type Scale:**
```css
--text-hero: 2.5rem;      /* 40px — hero headlines */
--text-display: 2rem;     /* 32px — page titles */
--text-display-s: 1.5rem; /* 24px — section titles */
--text-1: 1.25rem;        /* 20px — emphasis */
--text-2: 1rem;           /* 16px — body default */
--text-3: 0.875rem;       /* 14px — secondary text */
--text-4: 0.75rem;        /* 12px — labels, captions */
```

**Line Height:**
- Display (hero): 1.2
- Headings: 1.3
- Body: 1.6
- Inputs: 1.5

### Spacing Scale (4pt)

```css
--space-xs: 0.25rem;  /* 4px */
--space-sm: 0.5rem;   /* 8px */
--space-md: 1rem;     /* 16px */
--space-lg: 1.5rem;   /* 24px */
--space-xl: 2rem;     /* 32px */
--space-2xl: 3rem;    /* 48px */
--space-3xl: 4rem;    /* 64px */
```

**Section padding:** `--space-xl` top/bottom on desktop, `--space-lg` on mobile
**Element gap:** `--space-md` for card grids, `--space-sm` for inline items

### Borders & Radius

```css
--radius-sm: 0.25rem;    /* 4px — inputs, small UI */
--radius-md: 0.5rem;     /* 8px — buttons, cards */
--radius-lg: 1rem;       /* 16px — large cards, modals */
--radius-xl: 1.5rem;     /* 24px — hero shapes */

--border-light: 1px solid var(--color-border);
--border-strong: 1px solid var(--color-border-strong);
--border-accent: 2px solid var(--color-accent);
```

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-focus: 0 0 0 3px var(--color-accent);
```

### Motion & Easing

```css
--dur-fast: 150ms;
--dur-normal: 200ms;
--dur-slow: 300ms;

--ease-out: cubic-bezier(0.33, 1, 0.68, 1);
--ease-in: cubic-bezier(0.32, 0, 0.67, 0);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

**Rules:**
- Button hover: `opacity 200ms --ease-out`
- Modal enter: `opacity 150ms --ease-out`
- No bounce or overshoot on UI state
- Collapsed to opacity-only on `prefers-reduced-motion`

---

## Component Patterns

### Buttons

**Primary (CTA):**
- Background: `var(--color-accent)`
- Text: white, `--text-2` semibold
- Padding: `--space-sm` horizontal, `--space-xs` vertical
- Radius: `--radius-md`
- **States:** default · hover (darker green) · focus (ring + outline) · active (pressed down 1px) · disabled (light green + 50% opacity) · loading (spinner + text fade) · success (checkmark icon, green) · error (alert icon, red)

**Secondary:**
- Border: `--border-accent`
- Background: transparent
- Text: `var(--color-accent)`, semibold
- **States:** same as primary, but inverse colours on hover

**Tertiary (links, minor actions):**
- Background: transparent
- Text: `var(--color-accent)`, underline on hover
- No padding

**Button text:** Action verb (Add, Buy, Checkout, Track, Save). Never "Submit" or "OK".

### Forms & Inputs

**Input field:**
- Border: `--border-light`
- Background: `var(--color-paper-3)`
- Padding: `--space-sm` all sides
- Radius: `--radius-md`
- Font: `--text-2` body font
- **States:** default · focus (ring + forest-green border) · filled (no change) · error (red border + error icon right) · disabled (opacity 50%) · success (green border + checkmark)

**Label:**
- Font: `--text-3` semibold
- Margin-bottom: `--space-xs`
- Required indicator: red asterisk

**Error text:**
- Font: `--text-4` 
- Color: `var(--color-error)`
- Icon: warning triangle
- Margin-top: `--space-xs`

**Helper text:**
- Font: `--text-4`
- Color: `var(--color-text-tertiary)`

**Validation:** Server-side. On client, show field focus state only, no inline validation until blur.

### Product Card

**Desktop (6 per row on 1200px+):**
```
┌─────────────┐
│   [Image]   │  ← aspect ratio 1:1, object-fit cover
├─────────────┤
│ Product Name│  ← --text-2 semibold, 2 lines max
│ PKR 499     │  ← --text-1 bold, green accent color
│ ★★★★☆ (45) │  ← text-3, grey + count
│ In Stock    │  ← text-4, green badge
└─────────────┘
```

**Mobile (2 per row on mobile):**
```
┌──────┐
│      │ Product Name
│[IMG] │ PKR 499
│      │ ★★★★☆ (45)
└──────┘
```

**Hover state (desktop):** Opacity 95%, shadow lift
**Tap state (mobile):** Active outline
**Out of stock:** Overlay "Out of Stock", opacity 60%, no tap

### Bundle Card

**Visual distinction:** Border-left `--border-accent` (4px), "Bundle" badge top-right

```
┌─────────────────────────────┐
│ [BUNDLE]                    │
│ Summer Care Kit             │
│ Includes: Soap (2), Shampoo │
│ Regular: PKR 1,499 →        │
│ Bundle Price: PKR 999       │
│ Save 33% (PKR 500)          │
│ [Add to Cart]               │
└─────────────────────────────┘
```

**Key elements:**
- "Bundle" badge: green background, white text, `--text-4` bold
- Savings line: `var(--color-success)` bold
- Included items: `--text-3`, bullet list

### Navigation (N1b · Standard SaaS 3-section)

**Desktop (fixed top):**
```
┌────────────────────────────────────────────────────┐
│ [Logo] | Categories · Search · About | [Account ☐]│
└────────────────────────────────────────────────────┘
```

**Mobile (sticky top on scroll):**
```
┌──────────────────────────────┐
│ ☰ [Logo] [Search 🔍] [☐]    │
└──────────────────────────────┘
    ↓ (on tap ☰)
┌──────────────────────────────┐
│ Categories                   │
│ · Hair Care                  │
│ · Skin Care                  │
│ · Body Care                  │
│ About · Contact · Account    │
└──────────────────────────────┘
```

**Rules:**
- Logo is clickable → homepage
- Search opens full-page search UI (modal, or dedicated page on mobile)
- Account shows login/signup state (no account) or dropdown (logged in)
- Cart icon shows item count badge
- On scroll down: nav compacts to logo + essential icons
- On scroll up: nav expands fully

### Cart Summary

**In-page cart:**
```
Your Cart (3 items)
─────────────────────────────
[Item 1] × 2        PKR 998
[Item 2] × 1        PKR 499
─────────────────────────────
Subtotal:           PKR 1,497
Tax (0%):           PKR 0
Delivery:           Free
─────────────────────────────
Total:              PKR 1,497
[Proceed to Checkout]
```

**Checkout progress indicator (4 steps):**
```
1. Cart Review ✓  →  2. Address  →  3. Payment  →  4. Confirm
```

Each step is a clickable tab; user can jump back to previous steps.

### Badges & Status

**Stock status:**
- In Stock: Green `var(--color-success)` badge, `--text-4`
- Limited (5–10): Amber `var(--color-warning)` badge
- Out of Stock: Grey `var(--color-text-tertiary)` badge, strike-through price
- Reserved: Blue `var(--color-info)` badge (during checkout)

**Order status:**
- Pending: Grey
- Confirmed: Green
- Shipped: Blue
- Delivered: Green checkmark
- Cancelled: Red
- Refund Requested: Orange

**Payment status:**
- Awaiting Payment: Grey
- Pending: Orange
- Paid: Green checkmark
- Failed: Red
- Refunded: Grey strike-through

### Alerts & Toasts

**Alert box (in-page):**
```
┌─────────────────────────────┐
│ ⚠ Heading                  │
│ Message text here.          │
│ [Dismiss] [Action]         │
└─────────────────────────────┘
```

- Error: Red left border, red icon
- Warning: Amber left border, amber icon
- Success: Green left border, green icon
- Info: Blue left border, blue icon

**Toast (bottom-right, 4s auto-dismiss):**
```
✓ Order placed successfully
```

- No action buttons
- Dismissible via ×
- Stack max 3 toasts

### Tables (Admin)

**Desktop:**
- Header row: semibold, `var(--color-paper-2)` background
- Rows: `--border-light` separator
- Striped: alternate `var(--color-paper-3)` for visual rhythm
- Cell padding: `--space-md`
- Sortable columns: caret icon (↑↓) on hover
- Selectable rows: checkbox left; selected row has light green background

**Mobile:** Collapse to card-per-row layout (vertical key-value pairs)

---

## Page Layouts

### 1. Homepage (Customer)

**Sections (top to bottom):**

**Hero (Marquee):**
```
┌────────────────────────────┐
│                            │
│   Muskan Care Center       │
│   Personal Hygiene         │
│                            │
│   [Shop Now]               │
│                            │
└────────────────────────────┘
```
- Hero text: `--text-hero` bold Lora
- Subheading: `--text-display-s` secondary text
- CTA: Primary button
- Background: Subtle mint gradient or clean white with minimal accent bar
- No photography (typography-only per E1 enrichment)

**Categories Grid (6 cards, 2 rows):**
- Hair Care, Skin Care, Body Care, Soaps, Specialty, New Arrivals
- Each card: category image + name + item count
- Tap/click → category page

**Featured Products (8–12 cards grid):**
- Display 12 products for desktop, 6 for tablet, 4 for mobile
- Sort by: newest, popular, on-sale (admin configurable)
- "See All" link → full product listing

**Bundle Offers (3–4 bundles, carousel or grid):**
- Highlight savings (e.g., "Save 33%")
- "Add Bundle" CTA
- Right arrow to see more (mobile carousel)

**Testimonials (3 customer reviews, optional):**
- Star rating + quote + customer name
- Mobile: carousel (1 visible at a time)
- Desktop: 3 visible side-by-side

**FAQ (4–6 questions, collapsible):**
- "How long does delivery take?" → "2–5 business days"
- "Do you serve all of Pakistan?" → "Yes, all major cities"
- "What payment methods do you accept?" → "COD, JazzCash, Easypaisa"
- "How can I track my order?" → "Link provided in confirmation email"

**CTA Footer:**
```
────────────────────────
Ready to shop?
[Browse Products] [Contact Us]
────────────────────────
```

### 2. Product Listing (Categories) Page

**Header:**
```
Soaps & Body Wash
Showing 24 of 145 products
```

**Sidebar (desktop) / Collapsible (mobile):**
- Filter by: Price Range (slider), Rating (stars), Stock Status
- Sort by: Newest, Popularity, Price (Low to High), Price (High to Low)

**Product Grid:**
- 4 columns desktop, 2 columns tablet, 1 column mobile
- Each card: image, name, price, rating, stock status
- Lazy-load on scroll (pagination or infinite scroll)

**Pagination/Loading:**
- "Load More" button (mobile)
- Numbered pages (desktop)
- Loading spinner during fetch

### 3. Product Detail Page

**Layout (2-column desktop, stacked mobile):**

**Left Column (Image):**
- Main image (large, 1:1 aspect)
- Thumbnail gallery below (scrollable horizontal on mobile)
- Zoom on hover (desktop only)

**Right Column (Info):**
```
Product Name
★★★★☆ (45 reviews) · 1,234 sold

PKR 499
[In Stock · 23 left]

Variants:
[Size] ▼ (S, M, L)
[Fragrance] ▼ (Lavender, Unscented)

Quantity: [-] [1] [+]

[Add to Cart] [❤ Save]

Product Description
Lorem ipsum dolor sit amet...

Ingredients
• Ingredient 1
• Ingredient 2

Shipping & Returns
Delivered in 2–5 business days
Free returns within 30 days
```

**Recommendations (below):**
```
────────────────────────
Customers Also Liked
[4 product cards in grid]
────────────────────────
```

**Reviews Section:**
- Average rating + breakdown (5★, 4★, 3★, 2★, 1★)
- "Write a Review" form (logged-in customers only, out of scope for Phase 1)
- Review list: name, date, rating, text

### 4. Search Results Page

**Search bar at top (full-width on mobile, sidebar on desktop):**
```
🔍 Search products...
[Filter ▼] [Sort ▼]
```

**Results:**
- Show 24 per page
- If no results: "No products found. Try different keywords."
- Suggestion: "Did you mean: [alternative]?"

### 5. Cart Page

**Header:**
```
Your Shopping Cart
(3 items)
```

**Cart Items Table:**
```
Product      | Qty | Price  | Total   | Remove
─────────────────────────────────────────────
[Soap Img]   | [1] | 499    | 499     | ×
Product Name |     | PKR    | PKR     |

[Item 2]
[Item 3]
```

**Summary (sticky on scroll):**
```
────────────────────
Subtotal:     PKR 1,497
Tax:          PKR 0
Delivery:     Free
────────────────────
Total:        PKR 1,497
[Proceed to Checkout]
────────────────────
```

**Empty state:**
```
Your cart is empty
[Continue Shopping]
```

**Mobile:** Stacked card layout per item (image, name, qty, price, remove button)

### 6. Checkout Pages (4 Steps)

**Step 1: Cart Review**
```
Review Your Order
Order Summary (editable quantities)
[Edit Cart] [Continue to Address]
```

**Step 2: Delivery Address**
```
Delivery Address

[Saved Address 1] ○
[Saved Address 2] ○
[Enter New Address] ○

Full Name: [_________________]
Phone: [_________________]
Street Address: [_________________]
City: [_________________]
Postal Code: [_________________]

[Back] [Continue to Payment]
```

**Step 3: Payment Method**
```
Select Payment Method

○ Cash on Delivery (COD)
  Pay when order arrives

○ JazzCash
  Mobile wallet payment

○ Easypaisa
  Mobile wallet payment

[Back] [Confirm & Pay]
```

**Step 4: Order Confirmation**
```
✓ Order Placed!

Order ID: ORD-K9X7QM2L
Expected Delivery: 2–5 business days

[View Order Details] [Continue Shopping]

Confirmation email sent to: customer@example.com
```

### 7. Order Tracking (Guest & Logged-in)

**Guest Access (token-based link):**
```
Order Tracking
Order ID: ORD-K9X7QM2L
Date: Aug 16, 2026

Status Timeline:
[✓] Confirmed (Aug 16)
[→] Shipped (in progress)
[ ] Delivered

Items:
Soap (×2) — PKR 998

Delivery Address:
123 Main Street, Karachi, 75500

For details, confirm your email below:
[Email] [Verify]
```

**Logged-in (no verification needed):**
- Same layout, no email verification step
- Additional actions: Request refund, Contact support

### 8. Customer Account (Logged-in)

**Sidebar (desktop) / Tabs (mobile):**
- Profile
- Addresses
- Order History
- Settings

**Profile Tab:**
```
Your Profile

Name: [_________________]
Email: [_________________]
Phone: [_________________]
[Edit] [Save]

[Change Password]
[Logout]
```

**Addresses Tab:**
```
Saved Addresses

[Address 1]
123 Main St, Karachi
[Edit] [Delete] [Set as Default]

[+ Add New Address]
```

**Order History Tab:**
```
Your Orders (12 total)

[Recent Order 1]
Order ID | Date | Status | Total | Actions
ORD-1234 | 1d ago | Delivered | PKR 1,497 | [View]

[Order 2]
[Order 3]

[Older Orders] (pagination)
```

**Settings Tab:**
```
Account Settings

Email Notifications:
[✓] Order confirmations
[✓] Shipping updates
[✓] Promotional emails
[Save]
```

### 9. Login & Registration

**Login Page:**
```
Login to Your Account

Email: [_________________]
Password: [_________________]

[Login]

New customer? [Create Account]
Forgot password? [Reset]
```

**Registration Page:**
```
Create Account

Email: [_________________]
Password: [_________________]
Confirm Password: [_________________]
Name: [_________________]

[Create Account]

Already have an account? [Login]
```

**Password Reset Page:**
```
Reset Your Password

Email: [_________________]
[Send Reset Link]

(Confirmation: Check your email)
```

### 10. Error / Empty / Loading States

**Error Page (404, 500, etc.):**
```
Oops! Something went wrong.
Error 404: Page Not Found

[Go Home] [Contact Support]
```

**Empty State (No orders):**
```
No Orders Yet

Start shopping to see your orders here.

[Browse Products]
```

**Loading State:**
```
Loading...
[Skeleton loaders matching page structure]
```

---

## Admin Experience

### Admin Login

**Form:**
```
Admin Login

Email: [_________________]
Password: [_________________]
[Stay Logged In] ☐

[Login]
```

- Password requirement: 8+ chars, strong (enforced server-side)
- Failed attempts rate-limited
- Session timeout: 1 hour inactivity

### Admin Dashboard

**Key Metrics (top row):**
```
Today's Orders: 42 | Today's Revenue: PKR 21,000 | Pending Orders: 5 | Failed Payments: 2 | Low Stock: 3
```

**Quick Actions (sidebar or cards):**
- [+ Add Product]
- [View Pending Orders]
- [Manage Inventory]
- [View Failed Payments]

**Charts (optional):**
- Orders by day (last 7 days)
- Payment method breakdown (pie: COD vs JazzCash vs Easypaisa)
- Revenue trend (last 30 days)

**Recent Orders Table:**
```
Order ID | Date | Customer | Items | Status | Payment | Total
ORD-1234 | 1h ago | Ahmed K | 2 | Confirmed | COD | 1,497
ORD-1233 | 2h ago | Fatima A | 1 | Pending | JazzCash | 999
```

### Product Management

**Product List:**
```
Products (1,245 total)

[+ Add Product] [Bulk Upload] [Export]

Search: [_________________] [Filters ▼]

Name | SKU | Category | Price | Stock | Active | Actions
Soap | SKU-001 | Soaps | 499 | 45 | ✓ | [Edit] [Disable] [Delete]
```

**Add/Edit Product Form:**
```
Product Details

Name: [_________________]
Description: [_________________]
Category: [Select ▼]
SKU: [_________________]
Price: [_________________]
Stock: [_________________]

Images:
[Upload Image 1] [×]
[Upload Image 2] [×]
[+ Add Image]

Variants:
[Size] [Price Override] [Actions]
S | - | [Edit] [Delete]
M | - | [Edit] [Delete]
L | +100 | [Edit] [Delete]
[+ Add Variant]

[Cancel] [Save]
```

### Order Management

**Order List:**
```
Orders (12,450 total)

[Filters: Status ▼] [Payment Method ▼] [Date Range ▼]

Order ID | Date | Customer | Items | Status | Payment | Total | Actions
ORD-1234 | 1h | Ahmed K | 2 | Confirmed | Awaiting | 1,497 | [View]
```

**Order Detail:**
```
Order #ORD-1234

Customer: Ahmed K | Phone | Email
Address: 123 Main St, Karachi

Items:
Soap (×2) × PKR 499 = PKR 998
Shampoo (×1) × PKR 500 = PKR 500

Subtotal: PKR 1,498
Delivery: Free
Total: PKR 1,498

Status: [Confirmed ▼] [Update]
Payment: [Awaiting COD ▼] [Mark as Paid]

[Cancel Order] [Refund] [Send Email] [Print Invoice]

Timeline:
- Confirmed (2h ago)
```

### Inventory Management

**Inventory View:**
```
Inventory (1,245 products)

Product | Current | Reserved | Available | Threshold | Status
Soap | 100 | 5 | 95 | 5 | ✓
Shampoo | 12 | 2 | 10 | 5 | ⚠ (Low)
```

**Adjust Stock:**
```
Adjust Inventory

Product: Soap
Current: 100
New: 98
Reason: [Damaged ▼]
Notes: [Optional notes]

[Cancel] [Save]
```

### Bundle Management

**Bundle List:**
```
Bundles (24 total)

Name | Items | Price | Active | Actions
Summer Kit | 3 | 999 | ✓ | [Edit] [Disable]
```

**Add/Edit Bundle:**
```
Bundle Details

Name: [_________________]
Description: [_________________]
Regular Price: PKR 1,499
Bundle Price: PKR 999
Save: 33% (PKR 500)

Active: [✓] From [Date] To [Date]

Items:
Product | Variant | Qty | Price | Total
Soap | M | 2 | 499 | 998
Shampoo | - | 1 | 500 | 500

[+ Add Item] [Remove]

[Cancel] [Save]
```

### Payment Management

**Payment Transactions:**
```
Transactions (45,000 total)

Order | Amount | Method | Status | Attempts | Actions
ORD-1234 | 1,497 | COD | Awaiting | 0 | [Mark Paid]
ORD-1233 | 999 | JazzCash | Failed | 2/3 | [View Attempts] [Retry]

[Filters: Status ▼] [Method ▼]
```

**Payment Attempts (for failed payments):**
```
Order: ORD-1233
Payment Method: JazzCash
Attempts: 2/3

Attempt 1 (2h ago):
Status: Failed
Reason: Insufficient Funds
Gateway Response: Error Code 001

Attempt 2 (1h ago):
Status: Failed
Reason: Card Declined
Gateway Response: Error Code 002

[Manual Retry] [Mark as Paid] [Cancel Order]
```

### Customer Management

**Customer List:**
```
Customers (3,450 total)

Email | Name | Phone | Orders | Total Spent | Actions
ahmed@example.com | Ahmed K | 03001234567 | 5 | 7,485 | [View]
```

**Customer Detail:**
```
Customer: Ahmed K

Email: ahmed@example.com
Phone: 03001234567
Joined: Jan 2, 2026

Orders: 5 total, PKR 7,485 spent
Last Order: 2h ago (ORD-1234)

[Send Email] [View All Orders] [Delete Account]

Email History:
- Order Confirmed (2h ago)
- Payment Received (1h ago)
```

### Email Management

**Email Templates (view/edit):**
```
Email Templates

[Order Confirmation]
[Payment Confirmation]
[Payment Failure]
[Order Status Update]
[Refund Notification]
[Low Stock Alert]
```

**Email Configuration:**
```
Email Settings

From Name: Muskan Care Center
Support Email: support@muskancare.com
Support Phone: +92-3001234567
Website: https://muskancare.com
Social: Facebook | Instagram | WhatsApp

[Save]
```

### CSV Import/Export

**Export Orders:**
```
Export Orders

Filters: [Date Range ▼] [Status ▼]
Format: CSV

[Download]
```

**Export will include:**
- Order ID, Date, Customer, Email, Phone, Items, Qty, Price, Payment Method, Status, Total, Address

**Bulk Upload Products:**
```
Upload Products

CSV Format:
Name, SKU, Category, Price, Stock

[Select File] [Validate] [Upload]

Validation Results:
Row 1: ✓
Row 2: ✓
Row 3: ⚠ Missing Category
Row 4: ⚠ Duplicate SKU (SKU-001)

Fix errors and retry.
```

### Low-Stock Alerts

**Dashboard Alert:**
```
⚠ 3 products below threshold

Soap (10 units, threshold: 5)
Shampoo (2 units, threshold: 5)
Conditioner (4 units, threshold: 5)

[Manage Inventory]
```

**Email (daily digest at 9am):**
```
Subject: Daily Inventory Alert

3 products below low-stock threshold:

Soap: 10 units (threshold: 5)
Link: [Adjust]

Shampoo: 2 units (threshold: 5)
Link: [Adjust]

---
Manage thresholds: [Settings]
```

### Audit Logs

**Audit Log View:**
```
Audit Logs (12,450 entries)

Date | Admin | Action | Resource | Details
Aug 16, 9:30am | Admin1 | Product Updated | Soap | Price changed 499→599
Aug 16, 9:25am | Admin1 | Inventory Adjusted | Shampoo | Qty: 50→48 (Damaged)
Aug 16, 9:20am | Admin2 | Order Cancelled | ORD-1233 | Reason: Out of Stock
Aug 16, 9:15am | Admin1 | Login | - | IP: 192.168.1.1

[Filters: Action ▼] [Date Range ▼] [Admin ▼]
```

### Settings

**Service Area:**
```
Service Areas

Cities:
Karachi [Active ▼] [Edit]
Lahore [Active ▼] [Edit]
Islamabad [Active ▼] [Edit]
Rawalpindi [Inactive ▼] [Edit]

[+ Add City] [Import from List]
```

**Inventory Alerts:**
```
Low-Stock Threshold

Global Default: 5 units

[✓] Email alert on low stock
[✓] Daily digest at 9:00 AM

Per-Product Overrides:
Soap: 10 units
Shampoo: 3 units

[+ Override Product]
```

**Tax & Fees:**
```
Tax & Fees

Tax Rate: 0%
Delivery Fee: Free (or configurable per area)

Payment Fees:
- COD: 0%
- JazzCash: 2%
- Easypaisa: 2%

[Save]
```

---

## Responsive Behavior

### Mobile-First Breakpoints

```css
/* Mobile first (0–374px) */
/* All typography, spacing, components scale down */

/* Tablet (375–767px) */
/* 2-column product grids, larger touch targets */

/* Desktop (768px+) */
/* 4–6 column grids, full sidebar layouts */
```

### Key Responsive Rules

**Navigation:**
- Mobile: Hamburger menu (full-screen overlay on tap)
- Tablet+: Horizontal menu with categories

**Product Grid:**
- Mobile: 2 columns, full bleed
- Tablet: 3 columns
- Desktop: 4–6 columns

**Forms:**
- Full-width inputs on mobile
- Grouped inputs side-by-side on desktop (e.g., firstname + lastname)

**Tables:**
- Collapse to card-per-row on mobile (vertical key-value pairs)
- Full table view on tablet+

**Modals:**
- Full-screen on mobile (no padding edges)
- Centered box on desktop (max 600px width)

**Images:**
- Mobile: 100vw max (–20px padding)
- Desktop: Container-relative sizing

---

---

## Accessibility Requirements

**WCAG 2.2 Level AA compliance target:**

### Colour Contrast Matrix (WCAG 2.2 AA — 4.5:1 minimum for body text, 3:1 for large text)

| Text Colour | Background | WCAG Contrast | Size | Status |
|---|---|---|---|---|
| `--color-text` (L15) | `--color-paper` (L92) | 13.2:1 | Any | ✅ Pass |
| `--color-text-secondary` (L45) | `--color-paper` (L92) | 4.8:1 | Any | ✅ Pass |
| `--color-text-tertiary` (L65) | `--color-paper` (L92) | 1.8:1 | Body | ⚠️ Fail (use as decorative only) |
| `--color-accent` (L44) | `--color-paper` (L92) | 4.2:1 | Body | ✅ Pass |
| White text | `--color-accent` (L44) | 6.8:1 | Any | ✅ Pass |
| `--color-error` (L50) | `--color-paper` (L92) | 6.1:1 | Any | ✅ Pass |
| `--color-success` (L50) | `--color-paper` (L92) | 5.9:1 | Any | ✅ Pass |
| `--color-warning` (L65) | `--color-paper` (L92) | 3.2:1 | Large (18pt+) | ✅ Pass |

**Key rules:**
- `--color-text` (near-black on cream): All body text, labels, CTAs ✅
- `--color-text-secondary` (mid-grey): Secondary labels, hints ✅
- `--color-text-tertiary` (light grey): Decorative elements only (disabled text, placeholders) — NOT for readable content
- `--color-accent` (forest green): Interactive elements, links, emphasis ✅
- White text on `--color-accent`: Primary buttons, dark backgrounds ✅

### Additional Accessibility Rules

- **Colour contrast:** Minimum 4.5:1 for standard text, 3:1 for large text (per matrix above)
- **Focus states:** All interactive elements have visible `:focus-visible` ring (`--shadow-focus` token, 3px offset, forest-green)
- **Keyboard navigation:** Tab order logical, no keyboard traps
- **Form labels:** Associated with inputs via `<label for>` or ARIA
- **Error messages:** Linked to form fields, colour + icon (not colour alone)
- **Images:** Alt text on all product/category images
- **Motion:** `prefers-reduced-motion` collapses animations to opacity-only (≤150ms)
- **Semantics:** Use `<button>`, `<a>`, `<form>` correctly; no divs-as-buttons
- **Language:** `lang="en"` on root element (English primary; Urdu localization to follow in Phase 2)
- **Focus ring timing:** Ring appears instantly on focus; no animation on ring itself

---

## Customer Flows (UX Narrative)

### Flow 1: Browse & Buy (Happy Path)

```
Homepage
  ↓ [Browse Categories]
Category Listing
  ↓ [Tap Product]
Product Detail
  ↓ [Select Variant] [Set Qty] [Add to Cart]
Cart (notification: "Added to cart")
  ↓ [Checkout]
Step 1: Review
  ↓ [Continue]
Step 2: Address (pre-filled if logged in)
  ↓ [Continue]
Step 3: Payment (COD selected)
  ↓ [Confirm]
Step 4: Confirmation
  ↓ Email sent + order ID shown
Order Tracking (auto-redirect or button)
```

### Flow 2: Guest Checkout with Account Creation (Post-Purchase)

```
[Guest Checkout → Confirmation]
  ↓ "Create Account?" prompt
Registration
  ↓ [Enter Email + Password]
Account Created
  ↓ Email verification link sent
Customer verifies email
  ↓ Past guest orders auto-linked
Account page shows: "1 previous order linked"
```

### Flow 3: Return to Order & Track

```
Order Confirmation Email (token-based link)
  ↓ [Track Order]
Order Tracking Page (guest, no auth needed)
  ↓ Shows status + delivery address + request refund button
[Request Refund] → Form for refund bank details
  ↓ Submitted to admin
Admin sees refund request → processes manually
Customer notified via email
```

---

## Admin Flows

### Flow 1: Inventory Management

```
Dashboard
  ↓ [Manage Inventory]
Inventory Grid (1,245 products)
  ↓ [Adjust Stock] on low-stock item
Adjustment Form
  ↓ Enter new quantity + reason (Damaged/Lost/Return)
Saved
  ↓ Audit log records: "Qty 50→48 (Damaged)"
  ↓ (If now < threshold) Low-stock email queued
```

### Flow 2: Process Prepaid Order (Payment Failure → Retry)

```
Order List
  ↓ [View] on ORD-1233 (JazzCash, failed 2×)
Order Detail shows: "Payment Failed · 2/3 attempts"
  ↓ [Manual Retry] (admin-initiated) OR wait for customer retry
Payment gateway contacted
  ↓ Success: Order auto-confirms, confirmation email sent
  ↓ Failure: Attempt count increments, alert to admin if 3rd failure
Admin can then [Cancel Order] or [Refund]
```

### Flow 3: Bulk Upload Products

```
Dashboard
  ↓ [Bulk Upload]
Upload Form
  ↓ [Select CSV File]
Validation (all-or-nothing)
  ↓ If errors: Show error report with row numbers + fields
  ↓ If valid: [Confirm Upload]
Products created
  ↓ Audit log: "Bulk upload: 100 products created"
```

---

## Important States & Edge Cases

### Cart States

- **Empty cart:** Show "Your cart is empty" + [Continue Shopping] button
- **Item out-of-stock (after adding):** Show warning in cart + option to remove
- **Cart expired (30 days guest inactivity):** Silently removed; no notification needed
- **Session timeout during checkout:** Show "Session expired, please log in again" + preserve cart

### Payment States

- **Payment pending (prepaid):** Show spinner + "Processing payment…" + don't allow re-submission
- **Payment failed:** Show error reason + [Retry] button + allow retry up to 3× in 7 days
- **Payment timeout:** Show "We couldn't reach the payment gateway. Try again later." + preserve order
- **COD awaiting payment:** Show "Waiting for cash payment" + order marked CONFIRMED status

### Order States

- **Cancelled before shipping:** Show "Order cancelled" + refund initiated (if applicable)
- **Cancelled after shipping:** Not allowed via UI; admin-only in order detail
- **Refund requested:** Show "Refund pending review" + customer form for bank/wallet details

### Authentication States

- **Not logged in:** Show "Login or checkout as guest" at checkout Step 1
- **Logged in (cart from guest session):** Auto-merge guest cart if email matches + show notification
- **Session expired (1 hour admin inactivity):** Redirect to login + "Your session expired"

---

## Resolved Design Decisions

### UX-Impacting Decisions (Locked for Phase 1)

**1. Bundle Display Format**
- **Decision:** Grid on all breakpoints (desktop, tablet, mobile)
- **Rationale:** Consistent scanability; carousel adds complexity without benefit for 3–4 bundles
- **Implementation:** 3 bundles per row (desktop), 2 per row (tablet), 1 per row (mobile)

**2. Product Listing Pagination**
- **Decision:** Numbered pagination (desktop + tablet), "Load More" button (mobile)
- **Rationale:** Clearer context than infinite scroll; better for mobile back-button UX
- **Implementation:** Show 24 products per page

**3. Search Suggestions**
- **Decision:** Show top categories only (no autocomplete history)
- **Rationale:** Simpler implementation; categories provide sufficient guidance
- **Implementation:** Display 6 top-level categories on search focus

**4. Product Variants UI**
- **Decision:** Dropdowns (not tabs)
- **Rationale:** Smaller visual footprint on mobile; cleaner product detail layout
- **Implementation:** `<select>` or custom dropdown component

**5. Admin Metrics Charts**
- **Decision:** Simple sparklines only (no Chart.js)
- **Rationale:** Faster dashboard load; sparklines convey trend without interactivity overhead
- **Implementation:** 7-day order count + revenue sparklines in dashboard hero

### Implementation-Deferred Decisions (Phase 2)

**6. Guest Cart State Recovery** — Defer to Phase 2 after analytics show if needed
**7. Dynamic Product Recommendations** — Phase 2: Implement purchase-history tracking
**8. Mobile Menu Animation** — Phase 2: Specify left-slide vs. fade based on performance testing
**9. Admin Permission Roles** — Phase 2: Implement granular permissions (product_manager, order_manager, etc.)
**10. Advanced Email Templates** — Phase 2: Add SMS integration, dynamic templating system

---

## Empty-State & Loading State Microcopy

### Empty States (Action-Oriented)

**Cart Empty**
```
Your cart is empty.
Discover personal care products that fit your routine.
[Browse Products]
```

**Order History Empty (No Orders)**
```
No orders yet.
Ready to start shopping? We have personal care products for everyone.
[Start Shopping]
```

**Search Results Empty**
```
No products found for "xyz".
Try different keywords or browse by category.
[View Categories] [Clear Search]
```

**Wishlist / Saved Items** (if added in future)
```
Nothing saved yet.
Add items to revisit later.
[Continue Shopping]
```

**Admin: No Products**
```
No products yet.
Add your first personal care product to get started.
[+ Add Product]
```

**Admin: No Orders Today**
```
No orders today.
Check back later or view all orders.
[View All Orders]
```

**Admin: No Low Stock Alerts**
```
All products well-stocked.
Inventory is healthy. No action needed.
```

**Refund Request (No Refunds in History)**
```
No refund requests yet.
If you need to return a product, use the Order Details page.
[View My Orders]
```

### Loading States

- **Product List Loading:** Skeleton cards (same layout as product cards, grey placeholder images)
- **Checkout Loading:** "Processing your order..." with spinner
- **Payment Processing:** "Redirecting to payment gateway..." (don't hide, show progress)
- **Admin Dashboard Loading:** Skeleton metrics boxes (same as final layout, grey placeholders)
- **Page Transition:** Subtle opacity fade (150ms) with no spinner (unless > 1 second wait)

---

## Motion Timing Specifics

### Navigation & Mobile Menu

**Mobile Hamburger Menu Opening:**
- Animation: `transform: translateX(0)` from `translateX(-100vw)`
- Duration: `var(--dur-normal)` (200ms)
- Easing: `var(--ease-out)`
- Backdrop: Fade in `opacity` over 200ms

**Nav Scroll Behavior:**
- On scroll down: Compact nav height by 50% over 150ms
- On scroll up: Expand nav to full height over 150ms
- Uses `var(--ease-in-out)` for both directions

### Product & Cart Interactions

**Product Image Zoom (Desktop Hover):**
- Animation: `scale(1.05)` over 300ms using `var(--ease-out)`
- No motion on mobile

**Add to Cart Button:**
- Success: Icon morphs to checkmark, colour shifts to green (200ms opacity fade)
- Error: Shake effect via `transform: translateX` (100ms × 3 cycles, uses `var(--ease-in-out)`)

**Quantity Selector:**
- Increment/Decrement: No animation (instant update, visual feedback via colour)

---

## Language & Localization

**Phase 1 (Current):**
- Store language: **English**
- Root element: `lang="en"`
- All UI text: English
- All microcopy: English

**Phase 2 (Future):**
- Add Urdu translation layer
- Design supports RTL layout (flexbox/grid will reflow naturally with `direction: rtl`)
- Update root to support `lang="ur"` variant

**Design Principle:** All text is English-primary but structured for future Urdu localization:
- No hardcoded right-to-left assumptions
- All spacing uses logical properties (`margin-inline`, `padding-block`)
- Icons and imagery are culturally neutral

---

## Updated Open Decisions

**Resolved in this audit:**
1. ✅ Bundle display (grid, all breakpoints)
2. ✅ Pagination (numbered pages + Load More on mobile)
3. ✅ Search suggestions (top categories only)
4. ✅ Variant UI (dropdowns)
5. ✅ Admin charts (sparklines only)
6. ✅ Mobile menu animation (slide from left)
7. ✅ Font weights (locked: 400=body, 500=labels, 600=UI/buttons, 700=headings)
8. ✅ Colour contrast (WCAG 2.2 AA verified via matrix)
9. ✅ Empty-state microcopy (action-oriented, all screens)
10. ✅ Language (English Phase 1, Urdu-ready design)

**Deferred to Phase 2 (noted but not blocking):**
- Guest cart recovery optimization
- Purchase-history recommendations
- Advanced email templating
- Admin role-based permissions
- SMS integration

---

## Testimonials Resolution

**Homepage Testimonials Section:**
- **Decision:** Include 3 customer testimonials (locked count, not TBD)
- **Placeholder:** Real testimonials to be collected post-launch
- **Display:** Mobile carousel (1 visible), desktop 3-column grid
- **Source:** Customer feedback collected via post-delivery emails

---

## Exports

### Tokens CSS

```css
/* tokens.css — auto-generated from design system */

:root {
  /* Colors */
  --color-paper: oklch(92% 0.02 90);
  --color-paper-2: oklch(88% 0.015 90);
  --color-paper-3: oklch(95% 0.01 90);
  --color-accent: oklch(44% 0.15 142);
  --color-accent-dark: oklch(38% 0.15 142);
  --color-accent-light: oklch(52% 0.12 142);
  --color-text: oklch(15% 0.02 90);
  --color-text-secondary: oklch(45% 0.02 90);
  --color-text-tertiary: oklch(65% 0.015 90);
  --color-success: oklch(50% 0.15 142);
  --color-error: oklch(50% 0.16 25);
  --color-warning: oklch(65% 0.15 60);
  --color-info: oklch(55% 0.12 250);
  --color-border: oklch(80% 0.01 90);
  --color-border-strong: oklch(70% 0.02 90);

  /* Typography */
  --font-display: "Lora", serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "Courier Prime", monospace;

  --text-hero: 2.5rem;
  --text-display: 2rem;
  --text-display-s: 1.5rem;
  --text-1: 1.25rem;
  --text-2: 1rem;
  --text-3: 0.875rem;
  --text-4: 0.75rem;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;

  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-focus: 0 0 0 3px var(--color-accent);

  /* Motion */
  --dur-fast: 150ms;
  --dur-normal: 200ms;
  --dur-slow: 300ms;
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-in: cubic-bezier(0.32, 0, 0.67, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

---

**End of Design System**

System portable? Say `lock the system` if you need a standalone `design.md` file or multi-format exports (Tailwind @theme, DTCG tokens.json).
