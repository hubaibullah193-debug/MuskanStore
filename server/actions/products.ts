"use server";

/**
 * Product Server Actions
 * All database operations for products run server-side with RLS enforcement
 */

import { supabase } from "@/lib/supabase/client";
import { getActiveProducts, getProductById, searchProducts } from "@/lib/supabase/helpers";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";

// ===================================================================
// GET PRODUCTS (PAGINATED)
// ===================================================================

export async function getProducts(
  page: number = 1,
  limit: number = 20,
  categoryId?: string
) {
  try {
    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError("INVALID_PARAMS", "Invalid page or limit", 400);
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await getActiveProducts(limit, offset, categoryId);

    if (error) {
      throw new AppError("FETCH_PRODUCTS_FAILED", error.message, 500);
    }

    return {
      products: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_PRODUCTS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET PRODUCT DETAIL
// ===================================================================

export async function getProduct(productId: string) {
  try {
    if (!productId) {
      throw new AppError("INVALID_ID", "Product ID required", 400);
    }

    const { data, error } = await getProductById(productId);

    if (error || !data) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Ensure product is active (soft-delete check)
    if (!data.is_active) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not available", 404);
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_PRODUCT_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// SEARCH PRODUCTS
// ===================================================================

export async function searchProductsByQuery(query: string, limit: number = 20) {
  try {
    if (!query || query.trim().length < 2) {
      throw new AppError("INVALID_QUERY", "Search query must be at least 2 characters", 400);
    }

    if (limit < 1 || limit > 100) {
      throw new AppError("INVALID_LIMIT", "Limit must be between 1 and 100", 400);
    }

    const { data, error } = await searchProducts(query, limit);

    if (error) {
      throw new AppError("SEARCH_FAILED", error.message, 500);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("SEARCH_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET RELATED PRODUCTS (SAME CATEGORY)
// ===================================================================

export async function getRelatedProducts(productId: string, limit: number = 6) {
  try {
    if (!productId) {
      throw new AppError("INVALID_ID", "Product ID required", 400);
    }

    // Get current product to find its category
    const { data: currentProduct, error: productError } = await supabase
      .from("products")
      .select("category_id")
      .eq("id", productId)
      .eq("is_active", true)
      .single();

    if (productError || !currentProduct) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Get other products in same category
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        base_price,
        product_images (image_url)
      `
      )
      .eq("category_id", currentProduct.category_id)
      .eq("is_active", true)
      .neq("id", productId)
      .limit(limit)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError("FETCH_RELATED_FAILED", error.message, 500);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_RELATED_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// CHECK PRODUCT AVAILABILITY
// ===================================================================

export async function checkProductAvailability(
  productId: string,
  variantId?: string,
  quantity: number = 1
) {
  try {
    if (!productId || quantity < 1) {
      throw new AppError("INVALID_PARAMS", "Invalid product ID or quantity", 400);
    }

    // Check product exists and is active
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, is_active, base_price")
      .eq("id", productId)
      .single();

    if (productError || !product || !product.is_active) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not available", 404);
    }

    // Check inventory
    let inventoryQuery = supabase
      .from("product_inventory")
      .select("quantity, reserved")
      .eq("product_id", productId);

    if (variantId) {
      inventoryQuery = inventoryQuery.eq("variant_id", variantId);
    } else {
      inventoryQuery = inventoryQuery.is("variant_id", null);
    }

    const { data: inventory, error: inventoryError } = await inventoryQuery.single();

    if (inventoryError || !inventory) {
      throw new AppError("INVENTORY_NOT_FOUND", "Product inventory not found", 404);
    }

    const available = inventory.quantity - inventory.reserved;

    if (available < quantity) {
      return {
        available: true,
        message: "Insufficient inventory",
        quantity: available,
      };
    }

    return {
      available: true,
      message: "Product available",
      quantity: available,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AVAILABILITY_CHECK_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET PRODUCT PRICE (FOR CART/CHECKOUT VALIDATION)
// ===================================================================

export async function getProductPrice(productId: string, variantId?: string) {
  try {
    if (!productId) {
      throw new AppError("INVALID_ID", "Product ID required", 400);
    }

    // Get product price
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, base_price, is_active")
      .eq("id", productId)
      .single();

    if (productError || !product || !product.is_active) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not available", 404);
    }

    let finalPrice = product.base_price;

    // Check for variant override
    if (variantId) {
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("price_adjustment")
        .eq("id", variantId)
        .eq("product_id", productId)
        .single();

      if (!variantError && variant?.price_adjustment) {
        finalPrice = Number(product.base_price) + Number(variant.price_adjustment);
      }
    }

    return {
      productId,
      variantId,
      price: finalPrice,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("PRICE_FETCH_ERROR", getErrorMessage(error), 500);
  }
}
