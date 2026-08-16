/**
 * Database Types - Auto-generated compatible with Supabase schema
 * These types match the database schema defined in migrations/001_initial_schema.sql
 *
 * To regenerate from Supabase:
 * npx supabase gen types typescript --linked > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          parent_id?: string | null;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          sku: string;
          price: number;
          category_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          sku: string;
          price: number;
          category_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          sku?: string;
          price?: number;
          category_id?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku_suffix: string | null;
          price_override: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sku_suffix?: string | null;
          price_override?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          sku_suffix?: string | null;
          price_override?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          display_order?: number;
          created_at?: string;
        };
      };
      product_inventory: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          reserved: number;
          low_stock_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          reserved?: number;
          low_stock_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          reserved?: number;
          low_stock_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      bundles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          bundle_price: number;
          regular_price: number;
          discount_percent: number | null;
          is_active: boolean;
          active_from: string | null;
          active_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          bundle_price: number;
          regular_price: number;
          discount_percent?: number | null;
          is_active?: boolean;
          active_from?: string | null;
          active_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          bundle_price?: number;
          regular_price?: number;
          discount_percent?: number | null;
          is_active?: boolean;
          active_from?: string | null;
          active_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bundle_items: {
        Row: {
          id: string;
          bundle_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          bundle_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          bundle_id?: string;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          created_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
          guest_email: string | null;
          items: Json;
          created_at: string;
          last_activity: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_email?: string | null;
          items?: Json;
          created_at?: string;
          last_activity?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          guest_email?: string | null;
          items?: Json;
          created_at?: string;
          last_activity?: string;
          expires_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          guest_email: string | null;
          guest_token: string | null;
          guest_token_expires_at: string | null;
          items: Json;
          delivery_address: Json;
          order_status: string;
          payment_method: string;
          payment_status: string;
          total_amount: number;
          subtotal: number;
          tax_amount: number;
          delivery_fee: number;
          payment_fee: number;
          refund_amount: number | null;
          refund_reason: string | null;
          status_history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id?: string | null;
          guest_email?: string | null;
          guest_token?: string | null;
          guest_token_expires_at?: string | null;
          items: Json;
          delivery_address: Json;
          order_status?: string;
          payment_method: string;
          payment_status?: string;
          total_amount: number;
          subtotal: number;
          tax_amount?: number;
          delivery_fee?: number;
          payment_fee?: number;
          refund_amount?: number | null;
          refund_reason?: string | null;
          status_history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          guest_email?: string | null;
          guest_token?: string | null;
          guest_token_expires_at?: string | null;
          items?: Json;
          delivery_address?: Json;
          order_status?: string;
          payment_method?: string;
          payment_status?: string;
          total_amount?: number;
          subtotal?: number;
          tax_amount?: number;
          delivery_fee?: number;
          payment_fee?: number;
          refund_amount?: number | null;
          refund_reason?: string | null;
          status_history?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_attempts: {
        Row: {
          id: string;
          order_id: string;
          attempt_number: number;
          gateway_response_code: string | null;
          error_reason: string | null;
          is_counted_failure: boolean;
          attempted_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          attempt_number?: number;
          gateway_response_code?: string | null;
          error_reason?: string | null;
          is_counted_failure?: boolean;
          attempted_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          attempt_number?: number;
          gateway_response_code?: string | null;
          error_reason?: string | null;
          is_counted_failure?: boolean;
          attempted_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string | null;
          expires_at: string;
          last_activity: string;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          refresh_token?: string | null;
          expires_at: string;
          last_activity?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          refresh_token?: string | null;
          expires_at?: string;
          last_activity?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          resource_type: string;
          resource_id: string;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_areas: {
        Row: {
          id: string;
          city: string;
          postal_code_range: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          city: string;
          postal_code_range?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          city?: string;
          postal_code_range?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          order_id: string | null;
          recipient: string;
          email_type: string;
          subject: string | null;
          status: string;
          sent_at: string;
          retry_count: number;
          failed_reason: string | null;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          recipient: string;
          email_type: string;
          subject?: string | null;
          status?: string;
          sent_at?: string;
          retry_count?: number;
          failed_reason?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          recipient?: string;
          email_type?: string;
          subject?: string | null;
          status?: string;
          sent_at?: string;
          retry_count?: number;
          failed_reason?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          role: string;
          email_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          phone?: string | null;
          role?: string;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          phone?: string | null;
          role?: string;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_addresses: {
        Row: {
          id: string;
          user_id: string;
          street: string;
          city: string;
          postal_code: string | null;
          phone: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          street: string;
          city: string;
          postal_code?: string | null;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          street?: string;
          city?: string;
          postal_code?: string | null;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
