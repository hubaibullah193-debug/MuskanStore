"use server";

/**
 * Admin Product Management Server Actions
 * Add, edit, delete, bulk upload products
 * All operations restricted to admin role via RLS
 */

import { supabaseAdmin } from "@/lib/supabase/client";
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
    const { data: category, error: categoryError } = await supabaseAdmin.from("categories")
      .select("id")
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      throw new AppError("CATEGORY_NOT_FOUND", "Category not found", 404);
    }

    // Check SKU uniqueness
    const { data: existing } = await supabaseAdmin.from("products")
      .select("id")
      .eq("sku", validated.sku)
      .single();

    if (existing) {
      throw new AppError("SKU_DUPLICATE", "SKU already exists", 400);
    }

    // Create product
    const { data: product, error: productError } = await supabaseAdmin.from("products")
      .insert({
        name: validated.name,
        description: validated.description,
        sku: validated.sku,
        base_price: validated.base_price,
        category_id: validated.category_id,
        is_active: true,
      })
      .select()
      .single();

    if (productError || !product) {
      throw new AppError("PRODUCT_CREATE_FAILED", productError?.message || "Failed to create product", 500);
    }

    // Create default inventory entry
    const { error: inventoryError } = await supabaseAdmin.from("product_inventory")
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

      await supabaseAdmin.from("product_images").insert(imageRecords);
    }

    // Log audit event
    await logAuditEvent(
      "product_created",
      "product",
      product.id,
      {
        name: product.name,
        sku: product.sku,
        base_price: product.base_price,
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
    base_price?: number;
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
    const { data: currentProduct, error: getError } = await supabaseAdmin.from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (getError || !currentProduct) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Check SKU uniqueness if changing
    if (validated.sku && validated.sku !== currentProduct.sku) {
      const { data: existing } = await supabaseAdmin.from("products")
        .select("id")
        .eq("sku", validated.sku)
        .single();

      if (existing) {
        throw new AppError("SKU_DUPLICATE", "SKU already exists", 400);
      }
    }

    // Check category exists if changing
    if (validated.category_id && validated.category_id !== currentProduct.category_id) {
      const { data: category } = await supabaseAdmin.from("categories")
        .select("id")
        .eq("id", validated.category_id)
        .single();

      if (!category) {
        throw new AppError("CATEGORY_NOT_FOUND", "Category not found", 404);
      }
    }

    // Update product
    const { data: updated, error: updateError } = await supabaseAdmin.from("products")
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

    const { data: updated, error } = await supabaseAdmin.from("products")
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

    const { data: updated, error } = await supabaseAdmin.from("products")
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
// GET ALL PRODUCTS (admin)
// ===================================================================

export async function getAllProducts(filters?: { is_active?: boolean; search?: string }) {
  try {
    let query = supabaseAdmin.from("products")
      .select("id, name, sku, base_price, is_active, category_id, created_at")
      .order("created_at", { ascending: false });

    if (filters?.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError("FETCH_PRODUCTS_FAILED", error.message, 500);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_PRODUCTS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// WRAPPER: Disable Product (gets adminId from current user)
// ===================================================================

export async function disableProductAction(productId: string) {
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();

  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }

  return disableProduct(adminAccess.userId, productId);
}

// ===================================================================
// WRAPPER: Enable Product (gets adminId from current user)
// ===================================================================

export async function enableProductAction(productId: string) {
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();

  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }

  return enableProduct(adminAccess.userId, productId);
}

// ===================================================================
// WRAPPER: Add Product (gets adminId from current user)
// ===================================================================

export async function addProductAction(
  name: string,
  description: string | undefined,
  sku: string,
  price: number,
  categoryId: string
) {
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  return addProduct(adminAccess.userId, name, description, sku, price, categoryId);
}

// ===================================================================
// WRAPPER: Update Product (gets adminId from current user)
// ===================================================================

export async function updateProductAction(
  productId: string,
  updates: {
    name?: string;
    description?: string | null;
    sku?: string;
    base_price?: number;
    category_id?: string;
    is_active?: boolean;
  }
) {
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  return updateProduct(adminAccess.userId, productId, updates);
}

// ===================================================================
// BULK UPLOAD PRODUCTS
// ===================================================================

export async function bulkUploadProducts(
  rows: Array<{
    name: string;
    sku: string;
    category: string;
    base_price: number;
    stock: number;
  }>
) {
  // Resolve the acting admin from the session — never trust a client-supplied id
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  const adminId = adminAccess.userId;

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
        const { data: category, error: categoryError } = await supabaseAdmin.from("categories")
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
        const { data: existing } = await supabaseAdmin.from("products")
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
        const { data: product, error: productError } = await supabaseAdmin.from("products")
          .insert({
            name: row.name,
            sku: row.sku,
            base_price: row.base_price,
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
        await supabaseAdmin.from("product_inventory").insert({
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
// GET CATEGORIES (for dropdowns)
// ===================================================================

export async function getCategories() {
  try {
    const { data, error } = await supabaseAdmin.from("categories")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error) {
      throw new AppError("FETCH_CATEGORIES_FAILED", error.message, 500);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_CATEGORIES_ERROR", getErrorMessage(error), 500);
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
    const { data: product, error: productError } = await supabaseAdmin.from("products")
      .select("id")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Add image
    const { data: image, error: imageError } = await supabaseAdmin.from("product_images")
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
    const { data: image, error: getError } = await supabaseAdmin.from("product_images")
      .select("*")
      .eq("id", imageId)
      .single();

    if (getError || !image) {
      throw new AppError("IMAGE_NOT_FOUND", "Image not found", 404);
    }

    // Delete from storage if it's a storage URL
    if (image.image_url.includes("/storage/v1/object/public/")) {
      const urlParts = image.image_url.split("/storage/v1/object/public/");
      if (urlParts.length === 2) {
        const filePath = decodeURIComponent(urlParts[1]);
        const slashIdx = filePath.indexOf("/");
        if (slashIdx !== -1) {
          const bucket = filePath.substring(0, slashIdx);
          const path = filePath.substring(slashIdx + 1);
          await supabaseAdmin.storage.from(bucket).remove([path]);
        }
      }
    }

    // Delete image record
    const { error: deleteError } = await supabaseAdmin.from("product_images")
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

// ===================================================================
// GET PRODUCT IMAGES
// ===================================================================

export async function getProductImages(productId: string) {
  try {
    const { data, error } = await supabaseAdmin.from("product_images")
      .select("id, image_url, display_order")
      .eq("product_id", productId)
      .order("display_order", { ascending: true });

    if (error) {
      throw new AppError("FETCH_IMAGES_FAILED", error.message, 500);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_PRODUCT_IMAGES_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// ENSURE STORAGE BUCKET EXISTS
// ===================================================================

const PRODUCT_IMAGES_BUCKET = "product-images";

async function ensureProductImagesBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === PRODUCT_IMAGES_BUCKET);
  if (exists) return;

  const { error } = await supabaseAdmin.storage.createBucket(
    PRODUCT_IMAGES_BUCKET,
    { public: true }
  );
  if (error && !error.message.includes("already exists")) {
    throw new AppError(
      "BUCKET_CREATE_FAILED",
      `Failed to create storage bucket: ${error.message}`,
      500
    );
  }
}

// ===================================================================
// UPLOAD PRODUCT IMAGE
// ===================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadProductImage(
  adminId: string,
  productId: string,
  formData: FormData
) {
  try {
    if (!productId) {
      throw new AppError("INVALID_ID", "Product ID required", 400);
    }

    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      throw new AppError("NO_FILE", "No file provided", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError("FILE_TOO_SIZE", "File must be under 5MB", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new AppError(
        "INVALID_FILE_TYPE",
        "File must be JPEG, PNG, WebP, or GIF",
        400
      );
    }

    // Verify product exists
    const { data: product, error: productError } = await supabaseAdmin.from("products")
      .select("id")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Ensure bucket exists
    await ensureProductImagesBucket();

    // Upload to storage
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${productId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new AppError(
        "UPLOAD_FAILED",
        `Storage upload failed: ${uploadError.message}`,
        500
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(path);

    // Get current max display_order for this product
    const { data: existingImages } = await supabaseAdmin.from("product_images")
      .select("display_order")
      .eq("product_id", productId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder =
      existingImages && existingImages.length > 0
        ? existingImages[0].display_order + 1
        : 0;

    // Store URL in product_images
    const { data: image, error: imageError } = await supabaseAdmin.from("product_images")
      .insert({
        product_id: productId,
        image_url: publicUrl,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (imageError) {
      throw new AppError("IMAGE_RECORD_FAILED", imageError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "product_image_uploaded",
      "product_image",
      image.id,
      { productId, imageUrl: publicUrl, storagePath: path },
      adminId
    );

    return image;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UPLOAD_IMAGE_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// WRAPPER: Upload Product Image
// ===================================================================

export async function uploadProductImageAction(
  productId: string,
  formData: FormData
) {
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  return uploadProductImage(adminAccess.userId, productId, formData);
}

// ===================================================================
// WRAPPER: Remove Product Image
// ===================================================================

export async function removeProductImageAction(imageId: string) {
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  return removeProductImage(adminAccess.userId, imageId);
}
