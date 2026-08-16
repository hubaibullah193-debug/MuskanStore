"use server";

/**
 * Admin Product Management Server Actions
 * Add, edit, delete, bulk upload products
 * All operations restricted to admin role via RLS
 */

import { supabase, supabaseAdmin } from "@/lib/supabase/client";
import {
  ProductCreateSchema,
  ProductUpdateSchema,
  ProductBulkUploadSchema,
} from "@/lib/validation/schemas";
import { AppError, getErrorMessage, slugify } from "@/lib/utils/helpers";
import { logAuditEvent } from "@/lib/supabase/helpers";

// ===================================================================
// ADD PRODUCT
// ===================================================================

export async function addProduct(
  adminId: string,
  name: string,
  description: string | undefined,
  sku: string,
  price: number,
  categoryId: string,
  images?: Array<{ url: string; order: number }>
) {
  try {
    // Validate input
    const validated = ProductCreateSchema.parse({
      name,
      description,
      sku,
      price,
      category_id: categoryId,
    });

    // Check category exists
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      throw new AppError("CATEGORY_NOT_FOUND", "Category not found", 404);
    }

    // Check SKU uniqueness
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("sku", validated.sku)
      .single();

    if (existing) {
      throw new AppError("SKU_DUPLICATE", "SKU already exists", 400);
    }

    // Create product
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: validated.name,
        description: validated.description,
        sku: validated.sku,
        price: validated.price,
        category_id: validated.category_id,
        is_active: true,
      })
      .select()
      .single();

    if (productError || !product) {
      throw new AppError("PRODUCT_CREATE_FAILED", productError?.message || "Failed to create product", 500);
    }

    // Create default inventory entry
    const { error: inventoryError } = await supabase
      .from("product_inventory")
      .insert({
        product_id: product.id,
        variant_id: null,
        quantity: 0,
        reserved: 0,
        low_stock_threshold: 5,
      });

    if (inventoryError) {
      throw new AppError("INVENTORY_CREATE_FAILED", inventoryError.message, 500);
    }

    // Add images if provided
    if (images && images.length > 0) {
      const imageRecords = images.map((img) => ({
        product_id: product.id,
        image_url: img.url,
        display_order: img.order || 0,
      }));

      await supabase.from("product_images").insert(imageRecords);
    }

    // Log audit event
    await logAuditEvent(
      "product_created",
      "product",
      product.id,
      {
        name: product.name,
        sku: product.sku,
        price: product.price,
        categoryId: product.category_id,
      },
      adminId
    );

    return product;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ADD_PRODUCT_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// UPDATE PRODUCT
// ===================================================================

export async function updateProduct(
  adminId: string,
  productId: string,
  updates: {
    name?: string;
    description?: string | null;
    sku?: string;
    price?: number;
    category_id?: string;
    is_active?: boolean;
  }
) {
  try {
    if (!productId) {
      throw new AppError("INVALID_ID", "Product ID required", 400);
    }

    // Validate input
    const validated = ProductUpdateSchema.parse(updates);

    // Get current product
    const { data: currentProduct, error: getError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (getError || !currentProduct) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Check SKU uniqueness if changing
    if (validated.sku && validated.sku !== currentProduct.sku) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("sku", validated.sku)
        .single();

      if (existing) {
        throw new AppError("SKU_DUPLICATE", "SKU already exists", 400);
      }
    }

    // Check category exists if changing
    if (validated.category_id && validated.category_id !== currentProduct.category_id) {
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("id", validated.category_id)
        .single();

      if (!category) {
        throw new AppError("CATEGORY_NOT_FOUND", "Category not found", 404);
      }
    }

    // Update product
    const { data: updated, error: updateError } = await supabase
      .from("products")
      .update(validated)
      .eq("id", productId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("PRODUCT_UPDATE_FAILED", updateError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "product_updated",
      "product",
      productId,
      {
        changes: validated,
      },
      adminId
    );

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UPDATE_PRODUCT_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// DISABLE/SOFT DELETE PRODUCT
// ===================================================================

export async function disableProduct(adminId: string, productId: string) {
  try {
    if (!productId) {
      throw new AppError("INVALID_ID", "Product ID required", 400);
    }

    const { data: updated, error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      throw new AppError("DISABLE_FAILED", error.message, 500);
    }

    // Log audit event
    await logAuditEvent("product_disabled", "product", productId, {}, adminId);

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("DISABLE_PRODUCT_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// RE-ENABLE PRODUCT
// ===================================================================

export async function enableProduct(adminId: string, productId: string) {
  try {
    if (!productId) {
      throw new AppError("INVALID_ID", "Product ID required", 400);
    }

    const { data: updated, error } = await supabase
      .from("products")
      .update({ is_active: true })
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      throw new AppError("ENABLE_FAILED", error.message, 500);
    }

    // Log audit event
    await logAuditEvent("product_enabled", "product", productId, {}, adminId);

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ENABLE_PRODUCT_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// BULK UPLOAD PRODUCTS
// ===================================================================

export async function bulkUploadProducts(
  adminId: string,
  rows: Array<{
    name: string;
    sku: string;
    category: string;
    price: number;
    stock: number;
  }>
) {
  try {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError("EMPTY_UPLOAD", "No products to upload", 400);
    }

    // Validate all rows first
    const validated = ProductBulkUploadSchema.parse(rows);

    const errors = [];
    const successes = [];

    for (let i = 0; i < validated.length; i++) {
      const row = validated[i];

      try {
        // Get category by name
        const { data: category, error: categoryError } = await supabase
          .from("categories")
          .select("id")
          .eq("name", row.category)
          .single();

        if (categoryError || !category) {
          errors.push({
            rowNumber: i + 1,
            sku: row.sku,
            error: `Category "${row.category}" not found`,
          });
          continue;
        }

        // Check if SKU already exists
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("sku", row.sku)
          .single();

        if (existing) {
          errors.push({
            rowNumber: i + 1,
            sku: row.sku,
            error: "SKU already exists (skipped, not updated)",
          });
          continue;
        }

        // Create product
        const { data: product, error: productError } = await supabase
          .from("products")
          .insert({
            name: row.name,
            sku: row.sku,
            price: row.price,
            category_id: category.id,
            is_active: true,
          })
          .select()
          .single();

        if (productError || !product) {
          errors.push({
            rowNumber: i + 1,
            sku: row.sku,
            error: productError?.message || "Failed to create product",
          });
          continue;
        }

        // Create inventory entry
        await supabase.from("product_inventory").insert({
          product_id: product.id,
          variant_id: null,
          quantity: row.stock,
          reserved: 0,
          low_stock_threshold: 5,
        });

        successes.push({
          rowNumber: i + 1,
          sku: row.sku,
          productId: product.id,
        });
      } catch (rowError) {
        errors.push({
          rowNumber: i + 1,
          sku: row.sku,
          error: getErrorMessage(rowError),
        });
      }
    }

    // Log audit event for bulk upload
    await logAuditEvent(
      "bulk_product_upload",
      "product_batch",
      adminId,
      {
        totalRows: validated.length,
        successCount: successes.length,
        errorCount: errors.length,
      },
      adminId
    );

    return {
      totalRows: validated.length,
      successCount: successes.length,
      errorCount: errors.length,
      successes,
      errors,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("BULK_UPLOAD_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// ADD PRODUCT IMAGE
// ===================================================================

export async function addProductImage(
  adminId: string,
  productId: string,
  imageUrl: string,
  displayOrder: number = 0
) {
  try {
    if (!productId || !imageUrl) {
      throw new AppError("INVALID_PARAMS", "Product ID and image URL required", 400);
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Add image
    const { data: image, error: imageError } = await supabase
      .from("product_images")
      .insert({
        product_id: productId,
        image_url: imageUrl,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (imageError) {
      throw new AppError("IMAGE_ADD_FAILED", imageError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "product_image_added",
      "product_image",
      image.id,
      {
        productId,
        imageUrl,
        displayOrder,
      },
      adminId
    );

    return image;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ADD_IMAGE_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// REMOVE PRODUCT IMAGE
// ===================================================================

export async function removeProductImage(adminId: string, imageId: string) {
  try {
    if (!imageId) {
      throw new AppError("INVALID_ID", "Image ID required", 400);
    }

    // Get image first
    const { data: image, error: getError } = await supabase
      .from("product_images")
      .select("*")
      .eq("id", imageId)
      .single();

    if (getError || !image) {
      throw new AppError("IMAGE_NOT_FOUND", "Image not found", 404);
    }

    // Delete image
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      throw new AppError("IMAGE_DELETE_FAILED", deleteError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "product_image_removed",
      "product_image",
      imageId,
      {
        productId: image.product_id,
        imageUrl: image.image_url,
      },
      adminId
    );

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("REMOVE_IMAGE_ERROR", getErrorMessage(error), 500);
  }
}
