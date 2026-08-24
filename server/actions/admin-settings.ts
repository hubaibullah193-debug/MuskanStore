"use server";

/**
 * Admin Settings Management Server Actions
 * Manage email, tax, fees, service areas, and other global settings
 */

import { supabaseAdmin } from "@/lib/supabase/client";
import { SettingsSchema, ServiceAreaSchema } from "@/lib/validation/schemas";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";
import { logAuditEvent } from "@/lib/supabase/helpers";

// ===================================================================
// GET ALL SETTINGS
// ===================================================================

export async function getSettings() {
  try {
    const { data, error } = await supabaseAdmin.from("settings")
      .select("key, value");

    if (error) {
      throw new AppError("FETCH_SETTINGS_FAILED", error.message, 500);
    }

    // Convert to object
    const settings = (data || []).reduce(
      (acc, setting) => ({
        ...acc,
        [setting.key]: setting.value,
      }),
      {}
    );

    return settings;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_SETTINGS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// UPDATE SETTINGS
// ===================================================================

export async function updateSettings(
  adminId: string,
  settings: {
    support_email?: string;
    support_phone?: string;
    website_url?: string;
    tax_rate?: number;
    delivery_fee?: number;
    low_stock_threshold?: number;
  }
) {
  try {
    // Validate input
    const validated = SettingsSchema.parse(settings);

    // Update each setting
    for (const [key, value] of Object.entries(validated)) {
      const { error: upsertError } = await supabaseAdmin.from("settings")
        .upsert(
          {
            key: key.toLowerCase(),
            value,
          },
          { onConflict: "key" }
        );

      if (upsertError) {
        throw new AppError("SETTING_UPDATE_FAILED", upsertError.message, 500);
      }
    }

    // Log audit event
    await logAuditEvent(
      "settings_updated",
      "settings",
      "global",
      settings,
      adminId
    );

    return validated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UPDATE_SETTINGS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// WRAPPER: Update Settings (gets adminId from current user)
// ===================================================================

export async function updateSettingsAction(settings: {
  support_email?: string;
  support_phone?: string;
  website_url?: string;
  tax_rate?: number;
  delivery_fee?: number;
  low_stock_threshold?: number;
  email_provider?: "resend" | "sendgrid";
}) {
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  return updateSettings(adminAccess.userId, settings);
}

// ===================================================================
// GET SERVICE AREAS
// ===================================================================

export async function getServiceAreas(activeOnly: boolean = false) {
  try {
    let query = supabaseAdmin.from("service_areas")
      .select("*")
      .order("city", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError("FETCH_SERVICE_AREAS_FAILED", error.message, 500);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_SERVICE_AREAS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// ADD SERVICE AREA
// ===================================================================

export async function addServiceArea(
  adminId: string,
  city: string,
  postalCodeRange?: string
) {
  try {
    // Validate input
    const validated = ServiceAreaSchema.parse({
      city,
      postal_code_range: postalCodeRange,
      is_active: true,
    });

    // Check if city already exists
    const { data: existing } = await supabaseAdmin.from("service_areas")
      .select("id")
      .eq("city", validated.city)
      .single();

    if (existing) {
      throw new AppError("CITY_EXISTS", `${validated.city} already in service areas`, 400);
    }

    // Add service area
    const { data: area, error } = await supabaseAdmin.from("service_areas")
      .insert(validated)
      .select()
      .single();

    if (error) {
      throw new AppError("ADD_SERVICE_AREA_FAILED", error.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "service_area_added",
      "service_area",
      area.id,
      {
        city: validated.city,
        postalCodeRange: validated.postal_code_range,
      },
      adminId
    );

    return area;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ADD_SERVICE_AREA_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// DISABLE/ENABLE SERVICE AREA
// ===================================================================

export async function toggleServiceArea(adminId: string, areaId: string, isActive: boolean) {
  try {
    if (!areaId) {
      throw new AppError("INVALID_ID", "Service area ID required", 400);
    }

    // Get current area
    const { data: area, error: getError } = await supabaseAdmin.from("service_areas")
      .select("*")
      .eq("id", areaId)
      .single();

    if (getError || !area) {
      throw new AppError("SERVICE_AREA_NOT_FOUND", "Service area not found", 404);
    }

    // Update status
    const { data: updated, error: updateError } = await supabaseAdmin.from("service_areas")
      .update({ is_active: isActive })
      .eq("id", areaId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("UPDATE_FAILED", updateError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      isActive ? "service_area_enabled" : "service_area_disabled",
      "service_area",
      areaId,
      {
        city: area.city,
      },
      adminId
    );

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("TOGGLE_SERVICE_AREA_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// REMOVE SERVICE AREA
// ===================================================================

export async function removeServiceArea(adminId: string, areaId: string) {
  try {
    if (!areaId) {
      throw new AppError("INVALID_ID", "Service area ID required", 400);
    }

    // Get area before deletion
    const { data: area, error: getError } = await supabaseAdmin.from("service_areas")
      .select("*")
      .eq("id", areaId)
      .single();

    if (getError || !area) {
      throw new AppError("SERVICE_AREA_NOT_FOUND", "Service area not found", 404);
    }

    // Delete area
    const { error: deleteError } = await supabaseAdmin.from("service_areas")
      .delete()
      .eq("id", areaId);

    if (deleteError) {
      throw new AppError("DELETE_FAILED", deleteError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "service_area_removed",
      "service_area",
      areaId,
      {
        city: area.city,
      },
      adminId
    );

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("REMOVE_SERVICE_AREA_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// SEED INITIAL SERVICE AREAS (ALL PAKISTAN CITIES)
// ===================================================================

export async function seedServiceAreas(adminId: string) {
  try {
    // Check if service areas already exist
    const { count } = await supabaseAdmin.from("service_areas")
      .select("id", { count: "exact", head: true });

    if (count && count > 0) {
      throw new AppError("ALREADY_SEEDED", "Service areas already exist", 400);
    }

    // Pakistani major cities
    const cities = [
      "Karachi",
      "Lahore",
      "Islamabad",
      "Rawalpindi",
      "Multan",
      "Peshawar",
      "Quetta",
      "Faisalabad",
      "Hyderabad",
      "Gujranwala",
      "Sialkot",
      "Sargodha",
      "Bahawalpur",
      "Mardan",
      "Mirpur Khas",
      "Sukkur",
      "Khanewal",
      "Sahiwal",
      "Swat",
      "Abbottabad",
    ];

    const areaRecords = cities.map((city) => ({
      city,
      is_active: true,
    }));

    const { data, error } = await supabaseAdmin.from("service_areas")
      .insert(areaRecords)
      .select();

    if (error) {
      throw new AppError("SEED_FAILED", error.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "service_areas_seeded",
      "service_area",
      "batch",
      {
        count: data?.length || 0,
        cities,
      },
      adminId
    );

    return {
      seeded: data?.length || 0,
      cities: data || [],
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("SEED_SERVICE_AREAS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET AUDIT LOGS
// ===================================================================

export async function getAuditLogs(
  page: number = 1,
  limit: number = 50,
  filters?: {
    action?: string;
    resourceType?: string;
    adminId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  try {
    if (page < 1 || limit < 1 || limit > 500) {
      throw new AppError("INVALID_PARAMS", "Invalid page or limit", 400);
    }

    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from("admin_audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.action) {
      query = query.eq("action", filters.action);
    }

    if (filters?.resourceType) {
      query = query.eq("entity_type", filters.resourceType);
    }

    if (filters?.adminId) {
      query = query.eq("admin_id", filters.adminId);
    }

    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new AppError("FETCH_LOGS_FAILED", error.message, 500);
    }

    return {
      logs: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_AUDIT_LOGS_ERROR", getErrorMessage(error), 500);
  }
}
