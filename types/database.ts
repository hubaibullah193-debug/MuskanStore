/**
 * Database Types — Unified MVP Schema
 * These types match the schema defined in supabase/migrations/000_unified_mvp_schema.sql
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
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          role: string;
          email_verified: boolean;
          avatar_url: string | null;
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
          avatar_url?: string | null;
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
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
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
          slug: string;
          description: string | null;
          base_price: number;
          sku: string;
          category_id: string;
          stock_quantity: number;
          featured: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          base_price: number;
          sku: string;
          category_id: string;
          stock_quantity?: number;
          featured?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          base_price?: number;
          sku?: string;
          category_id?: string;
          stock_quantity?: number;
          featured?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          variant_name: string;
          sku: string;
          price_adjustment: number;
          stock_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_name: string;
          sku: string;
          price_adjustment?: number;
          stock_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_name?: string;
          sku?: string;
          price_adjustment?: number;
          stock_quantity?: number;
          is_active?: boolean;
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
      cart_items: {
        Row: {
          id: string;
          user_id: string | null;
          guest_email: string | null;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_email?: string | null;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          guest_email?: string | null;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          price?: number;
          created_at?: string;
          updated_at?: string;
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
          idempotency_key: string | null;
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
          payment_reference: string | null;
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
          idempotency_key?: string | null;
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
          payment_reference?: string | null;
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
          idempotency_key?: string | null;
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
          payment_reference?: string | null;
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
      inventory_reservations: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          status: string;
          created_at: string;
          expires_at: string;
          finalized_at: string | null;
          released_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity: number;
          status?: string;
          created_at?: string;
          expires_at: string;
          finalized_at?: string | null;
          released_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          status?: string;
          created_at?: string;
          expires_at?: string;
          finalized_at?: string | null;
          released_at?: string | null;
        };
      };
      webhook_processing: {
        Row: {
          id: string;
          order_id: string;
          transaction_id: string;
          payment_gateway: string;
          webhook_hash: string;
          processed_at: string;
          status: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          transaction_id: string;
          payment_gateway: string;
          webhook_hash: string;
          processed_at?: string;
          status?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          transaction_id?: string;
          payment_gateway?: string;
          webhook_hash?: string;
          processed_at?: string;
          status?: string;
        };
      };
      shipments: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          carrier: string;
          tracking_number: string | null;
          tracking_url: string | null;
          estimated_delivery: string | null;
          shipped_date: string | null;
          delivered_date: string | null;
          weight_kg: number | null;
          dimensions_cm: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status?: string;
          carrier?: string;
          tracking_number?: string | null;
          tracking_url?: string | null;
          estimated_delivery?: string | null;
          shipped_date?: string | null;
          delivered_date?: string | null;
          weight_kg?: number | null;
          dimensions_cm?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: string;
          carrier?: string;
          tracking_number?: string | null;
          tracking_url?: string | null;
          estimated_delivery?: string | null;
          shipped_date?: string | null;
          delivered_date?: string | null;
          weight_kg?: number | null;
          dimensions_cm?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      refunds: {
        Row: {
          id: string;
          order_id: string;
          requested_by: string | null;
          admin_id: string | null;
          status: string;
          refund_amount: number;
          reason: string;
          admin_notes: string | null;
          rejection_reason: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          requested_by?: string | null;
          admin_id?: string | null;
          status?: string;
          refund_amount: number;
          reason: string;
          admin_notes?: string | null;
          rejection_reason?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          requested_by?: string | null;
          admin_id?: string | null;
          status?: string;
          refund_amount?: number;
          reason?: string;
          admin_notes?: string | null;
          rejection_reason?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          recipient_email: string;
          subject: string;
          email_type: string;
          status: string;
          reference_id: string | null;
          reference_type: string | null;
          message_id: string | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          created_at: string;
          updated_at: string;
          sent_at: string | null;
          next_retry_at: string | null;
          idempotency_key: string | null;
          html_body: string | null;
        };
        Insert: {
          id?: string;
          recipient_email: string;
          subject: string;
          email_type: string;
          status?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          message_id?: string | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
          next_retry_at?: string | null;
          idempotency_key?: string | null;
          html_body?: string | null;
        };
        Update: {
          id?: string;
          recipient_email?: string;
          subject?: string;
          email_type?: string;
          status?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          message_id?: string | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
          next_retry_at?: string | null;
          idempotency_key?: string | null;
          html_body?: string | null;
        };
      };
      recipient_bounce_tracking: {
        Row: {
          recipient_email: string;
          bounce_count: number;
          last_bounce_at: string | null;
          marked_invalid: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          recipient_email: string;
          bounce_count?: number;
          last_bounce_at?: string | null;
          marked_invalid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          recipient_email?: string;
          bounce_count?: number;
          last_bounce_at?: string | null;
          marked_invalid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          order_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          order_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
          order_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          changes: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          changes?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          changes?: Json | null;
          created_at?: string;
        };
      };
      webhook_email_tracking: {
        Row: {
          id: string;
          order_id: string;
          transaction_id: string;
          payment_gateway: string;
          email_type: string;
          webhook_hash: string;
          sent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          transaction_id: string;
          payment_gateway: string;
          email_type: string;
          webhook_hash: string;
          sent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          transaction_id?: string;
          payment_gateway?: string;
          email_type?: string;
          webhook_hash?: string;
          sent_at?: string;
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
      bundles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          bundle_price: number;
          regular_price: number;
          discount_percent: number;
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
          regular_price?: number;
          discount_percent?: number;
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
          discount_percent?: number;
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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
