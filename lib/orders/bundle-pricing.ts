// lib/orders/bundle-pricing.ts
// Pure, DB-free helpers for server-side bundle handling.
//
// SECURITY CONTRACT:
// - The authoritative bundle price is ALWAYS the value stored in the database
//   (bundle.bundle_price). Any price supplied by the client is ignored.
// - The constituent products/variants of a bundle are resolved from the
//   database, never from the client. This makes "modified bundle contents"
//   and "manipulated bundle price" attacks impossible: the server recomputes
//   everything from the bundle_id alone.

import { AppError } from "@/lib/utils/helpers";

export interface ResolvedBundleItem {
  product_id: string;
  product_name: string;
  variant_id: string | null;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
}

export interface ResolvedBundle {
  id: string;
  name: string;
  bundle_price: number;
  is_active: boolean;
  active_from: string | null;
  active_to: string | null;
  items: ResolvedBundleItem[];
}

export interface BundleOrderItem {
  bundle_id: string;
  product_name: string;
  is_bundle: true;
  variant_id: null;
  variant_name: null;
  quantity: number;
  price: number;
  subtotal: number;
  bundle_items: ResolvedBundleItem[];
}

/**
 * Throw if a bundle cannot be purchased (inactive or outside its active
 * date window). Pure function so it can be unit-tested deterministically.
 */
export function assertBundlePurchasable(
  bundle: Pick<
    ResolvedBundle,
    "is_active" | "active_from" | "active_to"
  >,
  now: Date = new Date()
): void {
  if (!bundle.is_active) {
    throw new AppError(
      "BUNDLE_UNAVAILABLE",
      "This bundle offer is not available",
      400
    );
  }

  if (bundle.active_from && new Date(bundle.active_from).getTime() > now.getTime()) {
    throw new AppError(
      "BUNDLE_UNAVAILABLE",
      "This bundle offer is not yet active",
      400
    );
  }

  if (bundle.active_to && new Date(bundle.active_to).getTime() < now.getTime()) {
    throw new AppError(
      "BUNDLE_UNAVAILABLE",
      "This bundle offer has expired",
      400
    );
  }
}

/**
 * Return the authoritative, server-locked bundle price. The client-supplied
 * price is deliberately ignored and never returned.
 */
export function lockBundlePrice(
  bundle: Pick<ResolvedBundle, "bundle_price">,
  _clientPrice?: number
): number {
  const price = Number(bundle.bundle_price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new AppError(
      "BUNDLE_INVALID_PRICE",
      "Bundle has an invalid configured price",
      400
    );
  }
  return price;
}

/**
 * Build the order line item for a bundle. The price is always the
 * server-locked bundle price; the constituent items come from the resolved
 * bundle (DB), never the client.
 */
export function buildBundleOrderItem(
  bundle: ResolvedBundle,
  quantity: number
): BundleOrderItem {
  assertBundlePurchasable(bundle);
  const price = lockBundlePrice(bundle);

  return {
    bundle_id: bundle.id,
    product_name: bundle.name,
    is_bundle: true,
    variant_id: null,
    variant_name: null,
    quantity,
    price,
    subtotal: Math.round(price * quantity * 100) / 100,
    bundle_items: bundle.items,
  };
}
