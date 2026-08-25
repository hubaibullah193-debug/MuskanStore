// tests/unit/helpers.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateTotal,
  calculateDiscount,
  canCancelOrder,
  canRequestRefund,
  calculateCartSubtotal,
  formatPrice,
} from "@/lib/utils/helpers";

describe("calculateTotal", () => {
  it("sums components and rounds to 2 decimals", () => {
    expect(calculateTotal(1000, 170, 300, 0)).toBe(1470);
    expect(calculateTotal(33.33, 5.666, 0, 0)).toBe(39);
  });
});

describe("calculateDiscount", () => {
  it("returns the delta between regular and bundle price", () => {
    expect(calculateDiscount(1000, 800)).toBe(200);
    expect(calculateDiscount(1000, 1000)).toBe(0);
  });
});

describe("order status helpers", () => {
  it("allows cancellation only for pre-shipment states", () => {
    expect(canCancelOrder("pending")).toBe(true);
    expect(canCancelOrder("confirmed")).toBe(true);
    expect(canCancelOrder("shipped")).toBe(false);
    expect(canCancelOrder("delivered")).toBe(false);
  });

  it("allows refunds only for delivered orders (matches requestRefund rule)", () => {
    expect(canRequestRefund("delivered")).toBe(true);
    expect(canRequestRefund("shipped")).toBe(false);
    expect(canRequestRefund("refund_requested")).toBe(false);
  });
});

describe("calculateCartSubtotal", () => {
  it("multiplies price by quantity and rounds", () => {
    expect(
      calculateCartSubtotal([
        { product_id: "a", quantity: 2, price: 100 },
        { product_id: "b", quantity: 1, price: 50.5 },
      ])
    ).toBe(250.5);
  });
});

describe("formatPrice", () => {
  it("formats PKR without decimals by default", () => {
    expect(formatPrice(1234)).toContain("1,234");
  });
});
