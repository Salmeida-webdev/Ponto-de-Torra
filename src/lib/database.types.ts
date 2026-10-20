export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string
          id: string
          image_path: string | null
          is_published: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_path?: string | null
          is_published?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_path?: string | null
          is_published?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      content_entries: {
        Row: {
          body: string
          content_type: string
          created_at: string
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          content_type: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          content_type?: string
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          minimum_subtotal_cents: number
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          minimum_subtotal_cents?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          minimum_subtotal_cents?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      kit_components: {
        Row: {
          component_variant_id: string
          kit_variant_id: string
          quantity: number
        }
        Insert: {
          component_variant_id: string
          kit_variant_id: string
          quantity: number
        }
        Update: {
          component_variant_id?: string
          kit_variant_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_components_component_variant_id_fkey"
            columns: ["component_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_components_kit_variant_id_fkey"
            columns: ["kit_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total_cents: number | null
          order_id: string
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          sku_snapshot: string
          unit_price_cents: number
          variant_id: string | null
          variant_label_snapshot: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_cents?: number | null
          order_id: string
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          sku_snapshot: string
          unit_price_cents: number
          variant_id?: string | null
          variant_label_snapshot: string
        }
        Update: {
          created_at?: string
          id?: string
          line_total_cents?: number | null
          order_id?: string
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          sku_snapshot?: string
          unit_price_cents?: number
          variant_id?: string | null
          variant_label_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          discount_cents: number
          expires_at: string
          id: string
          idempotency_key: string
          order_number: number
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          request_hash: string | null
          shipped_at: string | null
          shipping_address: Json
          shipping_cents: number
          shipping_quote_option_id: string | null
          shipping_status: Database["public"]["Enums"]["shipping_status"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          discount_cents?: number
          expires_at?: string
          id?: string
          idempotency_key: string
          order_number?: never
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          request_hash?: string | null
          shipped_at?: string | null
          shipping_address: Json
          shipping_cents?: number
          shipping_quote_option_id?: string | null
          shipping_status?: Database["public"]["Enums"]["shipping_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          discount_cents?: number
          expires_at?: string
          id?: string
          idempotency_key?: string
          order_number?: never
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          request_hash?: string | null
          shipped_at?: string | null
          shipping_address?: Json
          shipping_cents?: number
          shipping_quote_option_id?: string | null
          shipping_status?: Database["public"]["Enums"]["shipping_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipping_quote_option_id_fkey"
            columns: ["shipping_quote_option_id"]
            isOneToOne: true
            referencedRelation: "shipping_quote_options"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          event_type: string
          id: string
          payload_summary: Json
          processed_at: string | null
          processing_error: string | null
          provider: string
          provider_event_id: string
          received_at: string
        }
        Insert: {
          event_type: string
          id?: string
          payload_summary?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          payload_summary?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_checkout_id: string | null
          provider_external_reference: string | null
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_checkout_id?: string | null
          provider_external_reference?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          order_id?: string
          provider?: string
          provider_checkout_id?: string | null
          provider_external_reference?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          storage_path: string
          variant_id: string | null
        }
        Insert: {
          alt_text: string
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
          variant_id?: string | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          compare_at_price_cents: number | null
          created_at: string
          dimensions_mm: Json
          id: string
          is_active: boolean
          label: string
          price_cents: number
          product_id: string
          sku: string
          stock_on_hand: number
          stock_reserved: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          attributes?: Json
          compare_at_price_cents?: number | null
          created_at?: string
          dimensions_mm?: Json
          id?: string
          is_active?: boolean
          label: string
          price_cents: number
          product_id: string
          sku: string
          stock_on_hand?: number
          stock_reserved?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          attributes?: Json
          compare_at_price_cents?: number | null
          created_at?: string
          dimensions_mm?: Json
          id?: string
          is_active?: boolean
          label?: string
          price_cents?: number
          product_id?: string
          sku?: string
          stock_on_hand?: number
          stock_reserved?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          category_id: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_portfolio_demo: boolean
          name: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_portfolio_demo?: boolean
          name: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_portfolio_demo?: boolean
          name?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          estimated_delivery_days: number | null
          id: string
          label_path: string | null
          order_id: string
          package_snapshot: Json
          provider: string
          provider_cart_id: string | null
          provider_company_id: string | null
          provider_service_id: string | null
          provider_shipment_id: string | null
          service_code: string | null
          service_name: string | null
          shipping_cents: number
          status: Database["public"]["Enums"]["shipping_status"]
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_delivery_days?: number | null
          id?: string
          label_path?: string | null
          order_id: string
          package_snapshot?: Json
          provider: string
          provider_cart_id?: string | null
          provider_company_id?: string | null
          provider_service_id?: string | null
          provider_shipment_id?: string | null
          service_code?: string | null
          service_name?: string | null
          shipping_cents: number
          status?: Database["public"]["Enums"]["shipping_status"]
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_delivery_days?: number | null
          id?: string
          label_path?: string | null
          order_id?: string
          package_snapshot?: Json
          provider?: string
          provider_cart_id?: string | null
          provider_company_id?: string | null
          provider_service_id?: string | null
          provider_shipment_id?: string | null
          service_code?: string | null
          service_name?: string | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["shipping_status"]
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_quote_options: {
        Row: {
          cart_fingerprint: string
          company_id: string
          company_name: string
          consumed_at: string | null
          created_at: string
          delivery_days: number | null
          expires_at: string
          id: string
          packages: Json
          price_cents: number
          provider_metadata: Json
          quote_group_id: string
          recipient_postal_code: string
          service_id: string
          service_name: string
        }
        Insert: {
          cart_fingerprint: string
          company_id: string
          company_name: string
          consumed_at?: string | null
          created_at?: string
          delivery_days?: number | null
          expires_at: string
          id?: string
          packages: Json
          price_cents: number
          provider_metadata?: Json
          quote_group_id: string
          recipient_postal_code: string
          service_id: string
          service_name: string
        }
        Update: {
          cart_fingerprint?: string
          company_id?: string
          company_name?: string
          consumed_at?: string | null
          created_at?: string
          delivery_days?: number | null
          expires_at?: string
          id?: string
          packages?: Json
          price_cents?: number
          provider_metadata?: Json
          quote_group_id?: string
          recipient_postal_code?: string
          service_id?: string
          service_name?: string
        }
        Relationships: []
      }
      staff_memberships: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          order_id: string | null
          quantity_delta: number
          reason: string
          variant_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          order_id?: string | null
          quantity_delta: number
          reason: string
          variant_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          order_id?: string | null
          quantity_delta?: number
          reason?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          committed_at: string | null
          created_at: string
          expires_at: string
          id: string
          order_id: string
          quantity: number
          released_at: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          variant_id: string
        }
        Insert: {
          committed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          quantity: number
          released_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          variant_id: string
        }
        Update: {
          committed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          quantity?: number
          released_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commit_order_stock: { Args: { p_order_id: string }; Returns: undefined }
      create_order_and_reserve:
        | {
            Args: {
              p_cart_fingerprint: string
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_idempotency_key: string
              p_items: Json
              p_request_hash: string
              p_shipping_address: Json
              p_shipping_quote_option_id: string
            }
            Returns: {
              already_created: boolean
              expires_at: string
              order_id: string
              order_number: number
              total_cents: number
            }[]
          }
        | {
            Args: {
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_idempotency_key: string
              p_items: Json
              p_request_hash: string
              p_shipping_address: Json
              p_shipping_cents?: number
            }
            Returns: {
              already_created: boolean
              expires_at: string
              order_id: string
              order_number: number
              total_cents: number
            }[]
          }
      me_cart_fingerprint: { Args: { p_items: Json }; Returns: string }
      me_check_quote_rate_limit: {
        Args: { p_key_hash: string }
        Returns: boolean
      }
      me_claim_token_refresh: {
        Args: never
        Returns: {
          access_expires_at: string
          claimed: boolean
          refresh_expires_at: string
          token_payload: Json
        }[]
      }
      me_consume_oauth_state: {
        Args: { p_state_hash: string }
        Returns: string
      }
      me_get_oauth_tokens: {
        Args: never
        Returns: {
          access_expires_at: string
          refresh_expires_at: string
          token_payload: Json
        }[]
      }
      me_save_oauth_state: {
        Args: { p_state_hash: string; p_user_id: string }
        Returns: undefined
      }
      me_save_oauth_tokens: {
        Args: {
          p_access_expires_at: string
          p_access_token: string
          p_authorized_by: string
          p_refresh_expires_at: string
          p_refresh_token: string
        }
        Returns: undefined
      }
      release_order_stock: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      reserve_order_stock: {
        Args: { p_hold_minutes?: number; p_order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      order_status:
        | "awaiting_payment"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "payment_failed"
        | "expired"
        | "refund_pending"
        | "refunded"
      payment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "refunded"
        | "chargeback"
      reservation_status: "reserved" | "committed" | "released" | "expired"
      shipping_status:
        | "pending"
        | "awaiting_label"
        | "label_created"
        | "posted"
        | "in_transit"
        | "delivered"
        | "exception"
        | "returned"
      staff_role: "admin" | "operator"
      stock_movement_type: "incoming" | "sale" | "return" | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "awaiting_payment",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "payment_failed",
        "expired",
        "refund_pending",
        "refunded",
      ],
      payment_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "refunded",
        "chargeback",
      ],
      reservation_status: ["reserved", "committed", "released", "expired"],
      shipping_status: [
        "pending",
        "awaiting_label",
        "label_created",
        "posted",
        "in_transit",
        "delivered",
        "exception",
        "returned",
      ],
      staff_role: ["admin", "operator"],
      stock_movement_type: ["incoming", "sale", "return", "adjustment"],
    },
  },
} as const

