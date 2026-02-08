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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addon_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          max_selections: number
          name: string
          restaurant_id: string | null
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number
          name: string
          restaurant_id?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number
          name?: string
          restaurant_id?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "addon_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          open_time: string
          restaurant_id: string | null
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          open_time: string
          restaurant_id?: string | null
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          open_time?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          restaurant_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          restaurant_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          restaurant_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          restaurant_id: string
          sent_at: string
          sent_by: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          restaurant_id: string
          sent_at?: string
          sent_by: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          restaurant_id?: string
          sent_at?: string
          sent_by?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_value: number | null
          restaurant_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_value?: number | null
          restaurant_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_value?: number | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          complement: string | null
          created_at: string
          customer_phone: string
          id: string
          is_default: boolean
          label: string
          neighborhood: string
          number: string
          reference: string | null
          restaurant_id: string | null
          street: string
          updated_at: string
        }
        Insert: {
          complement?: string | null
          created_at?: string
          customer_phone: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood: string
          number: string
          reference?: string | null
          restaurant_id?: string | null
          street: string
          updated_at?: string
        }
        Update: {
          complement?: string | null
          created_at?: string
          customer_phone?: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood?: string
          number?: string
          reference?: string | null
          restaurant_id?: string | null
          street?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string
          fee: number
          id: string
          is_active: boolean
          min_order_value: number | null
          name: string
          restaurant_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          name: string
          restaurant_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          name?: string
          restaurant_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_leads: {
        Row: {
          business_name: string | null
          business_type: string | null
          created_at: string | null
          email: string
          id: string
          mp_payment_id: string | null
          mp_payment_status: string | null
          name: string
          notes: string | null
          phone: string | null
          plan_id: string | null
          reseller_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          email: string
          id?: string
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          plan_id?: string | null
          reseller_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          email?: string
          id?: string
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          plan_id?: string | null
          reseller_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_leads_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_leads_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          observation: string | null
          order_id: number | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          observation?: string | null
          order_id?: number | null
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          observation?: string | null
          order_id?: number | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_complement: string | null
          address_neighborhood: string
          address_number: string
          address_reference: string | null
          address_street: string
          change_for: number | null
          created_at: string
          customer_name: string
          customer_phone: string
          id: number
          payment_method: string
          restaurant_id: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          address_complement?: string | null
          address_neighborhood: string
          address_number: string
          address_reference?: string | null
          address_street: string
          change_for?: number | null
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: number
          payment_method: string
          restaurant_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          address_complement?: string | null
          address_neighborhood?: string
          address_number?: string
          address_reference?: string | null
          address_street?: string
          change_for?: number | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: number
          payment_method?: string
          restaurant_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_groups: {
        Row: {
          addon_group_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          addon_group_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          addon_group_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_groups_addon_group_id_fkey"
            columns: ["addon_group_id"]
            isOneToOne: false
            referencedRelation: "addon_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          restaurant_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          restaurant_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          restaurant_id?: string | null
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
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          landing_faq: Json | null
          landing_page_email: string | null
          landing_page_enabled: boolean | null
          landing_page_logo: string | null
          landing_page_subtitle: string | null
          landing_page_title: string | null
          landing_page_whatsapp: string | null
          landing_stats: Json | null
          landing_testimonials: Json | null
          mp_access_token: string | null
          mp_integration_enabled: boolean | null
          mp_public_key: string | null
          mp_webhook_secret: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          landing_faq?: Json | null
          landing_page_email?: string | null
          landing_page_enabled?: boolean | null
          landing_page_logo?: string | null
          landing_page_subtitle?: string | null
          landing_page_title?: string | null
          landing_page_whatsapp?: string | null
          landing_stats?: Json | null
          landing_testimonials?: Json | null
          mp_access_token?: string | null
          mp_integration_enabled?: boolean | null
          mp_public_key?: string | null
          mp_webhook_secret?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          landing_faq?: Json | null
          landing_page_email?: string | null
          landing_page_enabled?: boolean | null
          landing_page_logo?: string | null
          landing_page_subtitle?: string | null
          landing_page_title?: string | null
          landing_page_whatsapp?: string | null
          landing_stats?: Json | null
          landing_testimonials?: Json | null
          mp_access_token?: string | null
          mp_integration_enabled?: boolean | null
          mp_public_key?: string | null
          mp_webhook_secret?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_admins: {
        Row: {
          created_at: string
          id: string
          is_owner: boolean
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_owner?: boolean
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_owner?: boolean
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_admins_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          monthly_fee: number
          mp_init_point: string | null
          mp_payer_email: string | null
          mp_subscription_id: string | null
          mp_subscription_status: string | null
          name: string
          owner_name: string | null
          phone: string | null
          plan_id: string | null
          reseller_id: string | null
          setup_fee: number | null
          slug: string
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_days: number
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_fee?: number
          mp_init_point?: string | null
          mp_payer_email?: string | null
          mp_subscription_id?: string | null
          mp_subscription_status?: string | null
          name: string
          owner_name?: string | null
          phone?: string | null
          plan_id?: string | null
          reseller_id?: string | null
          setup_fee?: number | null
          slug: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_days?: number
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_fee?: number
          mp_init_point?: string | null
          mp_payer_email?: string | null
          mp_subscription_id?: string | null
          mp_subscription_status?: string | null
          name?: string
          owner_name?: string | null
          phone?: string | null
          plan_id?: string | null
          reseller_id?: string | null
          setup_fee?: number | null
          slug?: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_config: {
        Row: {
          accent_color: string | null
          address: string | null
          cover_url: string | null
          created_at: string
          delivery_fee: number
          delivery_fee_mode: string | null
          delivery_time_max: number | null
          delivery_time_min: number | null
          id: string
          is_open: boolean
          kitchen_pin: string | null
          kitchen_pin_enabled: boolean | null
          logo_url: string | null
          min_order_value: number
          msg_order_accepted: string | null
          msg_order_completed: string | null
          msg_order_delivery: string | null
          msg_order_preparing: string | null
          name: string
          phone_whatsapp: string | null
          pix_key: string | null
          pix_key_type: string | null
          pix_message: string | null
          primary_color: string | null
          pwa_name: string | null
          pwa_short_name: string | null
          restaurant_id: string | null
          secondary_color: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_fee_mode?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          id?: string
          is_open?: boolean
          kitchen_pin?: string | null
          kitchen_pin_enabled?: boolean | null
          logo_url?: string | null
          min_order_value?: number
          msg_order_accepted?: string | null
          msg_order_completed?: string | null
          msg_order_delivery?: string | null
          msg_order_preparing?: string | null
          name?: string
          phone_whatsapp?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_message?: string | null
          primary_color?: string | null
          pwa_name?: string | null
          pwa_short_name?: string | null
          restaurant_id?: string | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_fee_mode?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          id?: string
          is_open?: boolean
          kitchen_pin?: string | null
          kitchen_pin_enabled?: boolean | null
          logo_url?: string | null
          min_order_value?: number
          msg_order_accepted?: string | null
          msg_order_completed?: string | null
          msg_order_delivery?: string | null
          msg_order_preparing?: string | null
          name?: string
          phone_whatsapp?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_message?: string | null
          primary_color?: string | null
          pwa_name?: string | null
          pwa_short_name?: string | null
          restaurant_id?: string | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_config_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          mp_external_reference: string | null
          mp_payment_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          restaurant_id: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          mp_external_reference?: string | null
          mp_payment_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          mp_external_reference?: string | null
          mp_payment_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          is_active: boolean
          is_popular: boolean | null
          monthly_fee: number
          name: string
          reseller_id: string
          setup_fee: number | null
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean
          is_popular?: boolean | null
          monthly_fee?: number
          name: string
          reseller_id: string
          setup_fee?: number | null
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean
          is_popular?: boolean | null
          monthly_fee?: number
          name?: string
          reseller_id?: string
          setup_fee?: number | null
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      table_order_items: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          id: string
          observation: string | null
          ordered_at: string | null
          product_id: string | null
          product_name: string
          quantity: number
          status: string | null
          table_order_id: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          observation?: string | null
          ordered_at?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          status?: string | null
          table_order_id?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          observation?: string | null
          ordered_at?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          status?: string | null
          table_order_id?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "table_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_order_items_table_order_id_fkey"
            columns: ["table_order_id"]
            isOneToOne: false
            referencedRelation: "table_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      table_orders: {
        Row: {
          closed_at: string | null
          created_at: string | null
          customer_count: number | null
          discount: number | null
          discount_type: string | null
          id: number
          notes: string | null
          opened_at: string | null
          payment_method: string | null
          restaurant_id: string | null
          service_fee_enabled: boolean | null
          service_fee_percentage: number | null
          status: string | null
          subtotal: number | null
          table_id: string | null
          total_amount: number | null
          updated_at: string | null
          waiter_id: string | null
          waiter_name: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          customer_count?: number | null
          discount?: number | null
          discount_type?: string | null
          id?: never
          notes?: string | null
          opened_at?: string | null
          payment_method?: string | null
          restaurant_id?: string | null
          service_fee_enabled?: boolean | null
          service_fee_percentage?: number | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          customer_count?: number | null
          discount?: number | null
          discount_type?: string | null
          id?: never
          notes?: string | null
          opened_at?: string | null
          payment_method?: string | null
          restaurant_id?: string | null
          service_fee_enabled?: boolean | null
          service_fee_percentage?: number | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          current_order_id: number | null
          id: string
          name: string | null
          number: number
          restaurant_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          current_order_id?: number | null
          id?: string
          name?: string | null
          number: number
          restaurant_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          current_order_id?: number | null
          id?: string
          name?: string | null
          number?: number
          restaurant_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "table_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waiters: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          pin: string | null
          restaurant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          pin?: string | null
          restaurant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          pin?: string | null
          restaurant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiters_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_restaurant_id_from_table: {
        Args: { _table_id: string }
        Returns: string
      }
      get_user_reseller_id: { Args: { _user_id: string }; Returns: string }
      get_user_restaurant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_of_restaurant: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_of_table_order: {
        Args: { _table_order_id: number; _user_id: string }
        Returns: boolean
      }
      is_reseller: { Args: { _user_id: string }; Returns: boolean }
      is_reseller_of_restaurant: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      is_restaurant_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "reseller"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      subscription_status: "trial" | "active" | "suspended" | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user", "reseller"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      subscription_status: ["trial", "active", "suspended", "cancelled"],
    },
  },
} as const
