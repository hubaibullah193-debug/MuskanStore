import { z } from "zod";

/**
 * Validation Schemas
 * Server-side input validation for all user-submitted data
 * Used in Server Actions and API routes
 */

// ===================================================================
// COMMON SCHEMAS
// ===================================================================

export const IdSchema = z.string().uuid("Invalid ID");
export const EmailSchema = z.string().email("Invalid email address");
export const PhoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-()]{10,}$/, "Invalid phone number");
export const PriceSchema = z.number().positive("Price must be greater than 0");
export const QuantitySchema = z.number().int().positive("Quantity must be at least 1");

// ===================================================================
// PRODUCT SCHEMAS
// ===================================================================

export const ProductCreateSchema = z.object({
  name: z.string().min(1, "Product name required").max(255),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU required").max(100),
  base_price: PriceSchema,
  category_id: IdSchema,
});

export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const ProductBulkUploadSchema = z.array(
  z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    category: z.string().min(1),
    base_price: PriceSchema,
    stock: QuantitySchema,
  })
);

// ===================================================================
// VARIANT SCHEMAS
// ===================================================================

export const VariantCreateSchema = z.object({
  product_id: IdSchema,
  variant_name: z.string().min(1, "Variant name required").max(255),
  sku: z.string().max(50).optional(),
  price_adjustment: z.number().positive().optional(),
});

export const VariantUpdateSchema = VariantCreateSchema.partial();

// ===================================================================
// CATEGORY SCHEMAS
// ===================================================================

export const CategoryCreateSchema = z.object({
  name: z.string().min(1, "Category name required").max(255),
  parent_id: IdSchema.optional(),
  slug: z
    .string()
    .min(1, "Slug required")
    .max(255)
    .regex(/^[a-z0-9\-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export const CategoryUpdateSchema = CategoryCreateSchema.partial();

// ===================================================================
// BUNDLE SCHEMAS
// ===================================================================

export const BundleItemSchema = z.object({
  product_id: IdSchema,
  variant_id: IdSchema.nullish(),
  quantity: QuantitySchema,
});

export const BundleCreateSchema = z.object({
  name: z.string().min(1, "Bundle name required").max(255),
  description: z.string().optional(),
  bundle_price: PriceSchema,
  regular_price: PriceSchema,
  items: z.array(BundleItemSchema).min(2, "Bundle must have at least 2 items"),
  active_from: z.string().datetime().optional(),
  active_to: z.string().datetime().optional(),
});

export const BundleUpdateSchema = BundleCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// ===================================================================
// INVENTORY SCHEMAS
// ===================================================================

export const InventoryAdjustmentSchema = z.object({
  product_id: IdSchema,
  variant_id: IdSchema.nullish(),
  new_quantity: z.number().int().nonnegative("Quantity cannot be negative"),
  reason: z.enum(["Damaged", "Lost", "Return", "Physical Count", "Correction", "Other"]),
  notes: z.string().max(500).optional(),
});

// ===================================================================
// CART SCHEMAS
// ===================================================================

export const CartItemSchema = z.object({
  product_id: IdSchema,
  variant_id: IdSchema.nullish(),
  quantity: QuantitySchema,
});

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
});

// ===================================================================
// ADDRESS SCHEMAS
// ===================================================================

export const AddressSchema = z.object({
  street: z.string().min(5, "Street address required").max(255),
  city: z.string().min(2, "City required").max(100),
  postal_code: z.string().min(2).max(20).optional(),
  phone: PhoneSchema.optional(),
  is_default: z.boolean().optional(),
});

export const DeliveryAddressSchema = AddressSchema.extend({
  recipient_name: z.string().min(1, "Recipient name required").max(255),
});

// ===================================================================
// ORDER SCHEMAS
// ===================================================================

export const OrderItemSchema = z.object({
  product_id: IdSchema,
  product_name: z.string(),
  variant_id: IdSchema.nullish(),
  variant_name: z.string().optional(),
  quantity: QuantitySchema,
  price: PriceSchema,
  subtotal: PriceSchema,
});

export const CheckoutSchema = z.object({
  items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  delivery_address: DeliveryAddressSchema,
  payment_method: z.enum(["cod", "jazz_cash", "easypaisa"]),
});

export const OrderStatusUpdateSchema = z.object({
  order_id: IdSchema,
  new_status: z.enum([
    "pending",
    "pending_payment",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
    "refund_requested",
    "refunded",
  ]),
  notes: z.string().optional(),
});

export const RefundRequestSchema = z.object({
  order_id: IdSchema,
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
  refund_method: z.enum(["bank_transfer", "jazz_cash", "easypaisa"]),
  refund_account: z.string().min(1, "Refund account/number required"),
});

// ===================================================================
// AUTHENTICATION SCHEMAS
// ===================================================================

export const SignUpSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number"),
  name: z.string().min(1, "Name required").max(255),
  phone: PhoneSchema.optional().or(z.literal('')).transform((v) => v || undefined),
});

export const LogInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password required"),
});

export const ResetPasswordSchema = z.object({
  email: EmailSchema,
});

export const UpdatePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password required"),
  new_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number"),
});

// ===================================================================
// USER SCHEMAS
// ===================================================================

export const UserProfileUpdateSchema = z.object({
  name: z.string().min(1, "Name required").max(255).optional(),
  phone: PhoneSchema.optional(),
});

// ===================================================================
// SETTINGS SCHEMAS
// ===================================================================

// Allow empty strings to be treated as "not provided" so partial saves work.
const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

export const SettingsSchema = z.object({
  support_email: z.preprocess(
    emptyToUndefined,
    EmailSchema.optional()
  ),
  support_phone: z.preprocess(
    emptyToUndefined,
    PhoneSchema.optional()
  ),
  website_url: z.preprocess(
    emptyToUndefined,
    z.string().url("Invalid website URL").optional()
  ),
  tax_rate: z.preprocess(
    emptyToUndefined,
    z.number().nonnegative().max(100).optional()
  ),
  delivery_fee: z.preprocess(
    emptyToUndefined,
    z.number().nonnegative().optional()
  ),
  low_stock_threshold: z.preprocess(
    emptyToUndefined,
    z.number().int().nonnegative().optional()
  ),
  email_provider: z.enum(["resend", "sendgrid"]).optional(),
});

// ===================================================================
// SERVICE AREA SCHEMAS
// ===================================================================

export const ServiceAreaSchema = z.object({
  city: z.string().min(1, "City name required").max(100),
  postal_code_range: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
});

// ===================================================================
// TYPE EXPORTS (Inferred from Zod schemas)
// ===================================================================

export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type VariantCreate = z.infer<typeof VariantCreateSchema>;
export type VariantUpdate = z.infer<typeof VariantUpdateSchema>;
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
export type BundleCreate = z.infer<typeof BundleCreateSchema>;
export type BundleUpdate = z.infer<typeof BundleUpdateSchema>;
export type InventoryAdjustment = z.infer<typeof InventoryAdjustmentSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type DeliveryAddress = z.infer<typeof DeliveryAddressSchema>;
export type Checkout = z.infer<typeof CheckoutSchema>;
export type OrderStatusUpdate = z.infer<typeof OrderStatusUpdateSchema>;
export type RefundRequest = z.infer<typeof RefundRequestSchema>;
export type SignUp = z.infer<typeof SignUpSchema>;
export type LogIn = z.infer<typeof LogInSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type ServiceArea = z.infer<typeof ServiceAreaSchema>;
