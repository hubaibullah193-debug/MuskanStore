/**
 * Utility Functions
 * Common helpers for formatting, calculations, and conversions
 */

// ===================================================================
// PRICE & CURRENCY UTILITIES
// ===================================================================

export function formatPrice(price: number, currency: string = "PKR"): string {
  const formatter = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(price);
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round((subtotal * taxRate) / 100 * 100) / 100;
}

export function calculateTotal(
  subtotal: number,
  taxAmount: number = 0,
  deliveryFee: number = 0,
  paymentFee: number = 0
): number {
  return Math.round((subtotal + taxAmount + deliveryFee + paymentFee) * 100) / 100;
}

export function calculateDiscount(regularPrice: number, bundlePrice: number): number {
  const discount = regularPrice - bundlePrice;
  return Math.round(discount * 100) / 100;
}

export function calculateDiscountPercent(regularPrice: number, bundlePrice: number): number {
  if (regularPrice === 0) return 0;
  const percent = ((regularPrice - bundlePrice) / regularPrice) * 100;
  return Math.round(percent * 100) / 100;
}

// ===================================================================
// TIME & DATE UTILITIES
// ===================================================================

export function isSessionExpired(lastActivity: Date, timeoutMs: number): boolean {
  const now = new Date();
  return now.getTime() - lastActivity.getTime() > timeoutMs;
}

export function getSessionTimeoutMs(role: "customer" | "admin"): number {
  // Customer: 2 weeks, Admin: 1 hour
  return role === "admin" ? 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
}

export function formatDate(date: string | Date, locale: string = "en-PK"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date, locale: string = "en-PK"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(d);
}

// ===================================================================
// STRING & FORMATTING UTILITIES
// ===================================================================

export function truncate(text: string, maxLength: number = 100): string {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-");
}

export function formatPhoneNumber(phone: string): string {
  // Format Pakistani phone numbers
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+92${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("92")) {
    return `+${cleaned}`;
  }
  return phone;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  const masked = local.slice(0, 2) + "*".repeat(Math.max(0, local.length - 4)) + local.slice(-2);
  return `${masked}@${domain}`;
}

// ===================================================================
// ARRAY & OBJECT UTILITIES
// ===================================================================

export function groupBy<T, K extends string | number>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (acc, item) => {
      const key = getKey(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

export function sumBy<T>(array: T[], getValue: (item: T) => number): number {
  return array.reduce((sum, item) => sum + getValue(item), 0);
}

export function uniqueBy<T, K extends string | number>(
  array: T[],
  getKey: (item: T) => K
): T[] {
  const seen = new Set<K>();
  return array.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function compact<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item): item is T => item != null);
}

// ===================================================================
// VALIDATION UTILITIES
// ===================================================================

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPhone(phone: string): boolean {
  const re = /^\+?[\d\s\-()]{10,}$/;
  return re.test(phone);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ===================================================================
// ERROR UTILITIES
// ===================================================================

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

// ===================================================================
// CART UTILITIES
// ===================================================================

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
}

export function consolidateCartItems(items: CartItem[]): CartItem[] {
  const consolidated = new Map<string, CartItem>();

  items.forEach((item) => {
    const key = `${item.productId}:${item.variantId || "none"}`;
    const existing = consolidated.get(key);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      consolidated.set(key, { ...item });
    }
  });

  return Array.from(consolidated.values());
}

export function calculateCartSubtotal(items: CartItem[]): number {
  return Math.round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100
  ) / 100;
}

// ===================================================================
// INVENTORY UTILITIES
// ===================================================================

export function getAvailableStock(quantity: number, reserved: number): number {
  return Math.max(0, quantity - reserved);
}

export function isLowStock(available: number, threshold: number): boolean {
  return available <= threshold;
}

// ===================================================================
// PAYMENT UTILITIES
// ===================================================================

export const PAYMENT_METHODS = {
  cod: { label: "Cash on Delivery", value: "cod" },
  jazz_cash: { label: "JazzCash", value: "jazz_cash" },
  easypaisa: { label: "Easypaisa", value: "easypaisa" },
} as const;

export const ORDER_STATUSES = {
  pending: "Pending",
  pending_payment: "Payment Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refund_requested: "Refund Requested",
  refunded: "Refunded",
} as const;

export const PAYMENT_STATUSES = {
  awaiting_cod: "Awaiting Payment",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
} as const;

export function getOrderStatusLabel(status: string): string {
  return (ORDER_STATUSES as Record<string, string>)[status] || status;
}

export function getPaymentStatusLabel(status: string): string {
  return (PAYMENT_STATUSES as Record<string, string>)[status] || status;
}

export function canCancelOrder(orderStatus: string): boolean {
  return ["pending", "pending_payment", "confirmed"].includes(orderStatus);
}

export function canRequestRefund(orderStatus: string): boolean {
  return ["delivered"].includes(orderStatus);
}

// ===================================================================
// ADDRESS UTILITIES
// ===================================================================

export function formatAddress(street: string, city: string, postalCode?: string): string {
  const parts = [street, city, postalCode].filter(Boolean);
  return parts.join(", ");
}

// ===================================================================
// RANDOM UTILITIES
// ===================================================================

export function generateRandomString(length: number = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof global !== "undefined" && (global as any).crypto) {
    (global as any).crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
