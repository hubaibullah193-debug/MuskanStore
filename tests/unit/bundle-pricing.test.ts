// tests/unit/bundle-pricing.test.ts
import { describe, it, expect } from "vitest";
import {
  assertBundlePurchasable,
  lockBundlePrice,
  buildBundleOrderItem,
  type ResolvedBundle,
  type ResolvedBundleItem,
} from "@/lib/orders/bundle-pricing";
import { AppError } from "@/lib/utils/helpers";

const makeItem = (over: Partial<ResolvedBundleItem> = {}): ResolvedBundleItem => ({
  product_id: "p1",
  product_name: "Product 1",
  variant_id: null,
  variant_name: null,
  quantity: 1,
  unit_price: 100,
  ...over,
});

const makeBundle = (over: Partial<ResolvedBundle> = {}): ResolvedBundle => ({
  id: "b1",
  name: "Test Bundle",
  bundle_price: 200,
  is_active: true,
  active_from: null,
  active_to: null,
  items: [makeItem(), makeItem({ product_id: "p2" })],
  ...over,
});

describe("lockBundlePrice", () => {
  it("returns the authoritative DB price, ignoring the client price", () => {
    const price = lockBundlePrice({ bundle_price: 250 }, 1);
    expect(price).toBe(250);
  });

  it("ignores a manipulated client price (even extreme values)", () => {
    expect(lockBundlePrice({ bundle_price: 199 }, 0)).toBe(199);
    expect(lockBundlePrice({ bundle_price: 199 }, 999999)).toBe(199);
  });

  it("throws on an invalid configured DB price", () => {
    expect(() => lockBundlePrice({ bundle_price: 0 })).toThrow(AppError);
    expect(() => lockBundlePrice({ bundle_price: -5 })).toThrow(AppError);
    expect(() => lockBundlePrice({ bundle_price: NaN })).toThrow(AppError);
  });
});

describe("assertBundlePurchasable", () => {
  it("passes for an active bundle with no date window", () => {
    expect(() => assertBundlePurchasable(makeBundle())).not.toThrow();
  });

  it("throws when the bundle is inactive", () => {
    expect(() => assertBundlePurchasable(makeBundle({ is_active: false }))).toThrow(
      AppError
    );
  });

  it("throws when before active_from", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(() =>
      assertBundlePurchasable(makeBundle({ active_from: future }))
    ).toThrow(AppError);
  });

  it("throws when after active_to", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    expect(() =>
      assertBundlePurchasable(makeBundle({ active_to: past }))
    ).toThrow(AppError);
  });

  it("allows an active bundle whose window is open", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(() =>
      assertBundlePurchasable(makeBundle({ active_from: past, active_to: future }))
    ).not.toThrow();
  });
});

describe("buildBundleOrderItem", () => {
  it("locks the price and ignores any tampered client/contents price", () => {
    // Even if a malicious caller passes tampered constituent items with
    // unit_price 0, the line price comes from bundle.bundle_price only.
    const tampered = makeBundle({
      items: [makeItem({ unit_price: 0 }), makeItem({ product_id: "x", unit_price: 0 })],
    });
    const line = buildBundleOrderItem(tampered, 2);
    expect(line.price).toBe(200);
    expect(line.subtotal).toBe(400);
    expect(line.is_bundle).toBe(true);
    expect(line.bundle_id).toBe("b1");
    expect(line.quantity).toBe(2);
  });

  it("propagates purchasability errors (expired bundle)", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    expect(() => buildBundleOrderItem(makeBundle({ active_to: past }), 1)).toThrow(
      AppError
    );
  });
});
