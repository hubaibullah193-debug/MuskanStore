"use server";

/**
 * Admin Dashboard Server Action
 * Aggregates dashboard metrics (orders, revenue, low-stock, daily trends).
 * Runs server-side using the anon Supabase client (RLS-enforced), matching
 * the pattern used by other admin server actions.
 */

import { supabaseAdmin } from "@/lib/supabase/client";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";

export async function getAdminDashboardStats() {
  try {
    const { verifyAdminAccess } = await import("./auth");
    if (!(await verifyAdminAccess())) {
      throw new AppError("UNAUTHORIZED", "Admin access required", 403);
    }

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersError) {
      throw new AppError("FETCH_ORDERS_FAILED", ordersError.message, 500);
    }

    const totalOrders = orders?.length || 0;
    const totalRevenue =
      orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
    const pendingOrders =
      orders?.filter(
        (o: any) =>
          o.order_status === "pending" || o.order_status === "pending_payment"
      ).length || 0;
    const refundRequests =
      orders?.filter((o: any) => o.order_status === "refund_requested").length || 0;

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const { data: recentOrdersData, error: recentError } = await supabaseAdmin.from("orders")
      .select("created_at, total_amount, order_status")
      .gte("created_at", fourteenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (recentError) {
      throw new AppError("FETCH_RECENT_FAILED", recentError.message, 500);
    }

    const dayMap: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dayMap[key] = { orders: 0, revenue: 0 };
    }
    (recentOrdersData || []).forEach((o: any) => {
      const key = o.created_at.split("T")[0];
      if (dayMap[key]) {
        dayMap[key].orders++;
        dayMap[key].revenue += o.total_amount || 0;
      }
    });
    const dailyStats = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));

    const { data: inventory, error: invError } = await supabaseAdmin.from("product_inventory")
      .select("quantity, low_stock_threshold, product_id, variant_id")
      .lte("quantity", 5)
      .order("quantity", { ascending: true })
      .limit(10);

    if (invError) {
      throw new AppError("FETCH_INVENTORY_FAILED", invError.message, 500);
    }

    let lowStockProducts: any[] = [];
    if (inventory && inventory.length > 0) {
      const productIds = inventory.map((i: any) => i.product_id).filter(Boolean);
      const { data: products, error: prodError } = await supabaseAdmin.from("products")
        .select("id, name, sku")
        .in("id", productIds);

      if (prodError) {
        throw new AppError("FETCH_PRODUCTS_FAILED", prodError.message, 500);
      }

      const productMap = new Map((products || []).map((p: any) => [p.id, p]));
      lowStockProducts = inventory
        .map((inv: any) => ({ ...inv, product: productMap.get(inv.product_id) }))
        .filter((i: any) => i.product);
    }

    return {
      stats: { totalOrders, totalRevenue, pendingOrders, refundRequests },
      recentOrders: orders?.slice(0, 10) || [],
      dailyStats,
      lowStockProducts,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("DASHBOARD_ERROR", getErrorMessage(error), 500);
  }
}
