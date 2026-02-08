export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Reseller {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Mercado Pago fields
  mp_access_token?: string | null;
  mp_public_key?: string | null;
  mp_webhook_secret?: string | null;
  mp_integration_enabled?: boolean;
  // Color fields
  primary_color?: string | null;
  secondary_color?: string | null;
  // Landing page fields
  slug?: string | null;
  landing_page_logo?: string | null;
  landing_page_title?: string | null;
  landing_page_subtitle?: string | null;
  landing_page_whatsapp?: string | null;
  landing_page_email?: string | null;
  landing_page_enabled?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  reseller_id: string;
  name: string;
  description: string | null;
  monthly_fee: number;
  trial_days: number;
  setup_fee?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Landing page fields
  features?: string[] | null;
  is_popular?: boolean;
}

export interface Restaurant {
  id: string;
  reseller_id: string | null;
  slug: string;
  name: string;
  is_active: boolean;
  subscription_status: SubscriptionStatus;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  monthly_fee: number;
  trial_days: number;
  setup_fee?: number;
  created_at: string;
  updated_at: string;
  plan_id?: string | null;
  // Contact fields
  phone?: string | null;
  owner_name?: string | null;
  contact_email?: string | null;
  // Mercado Pago fields
  mp_subscription_id?: string | null;
  mp_payer_email?: string | null;
  mp_init_point?: string | null;
  mp_subscription_status?: string | null;
}

export interface RestaurantAdmin {
  id: string;
  restaurant_id: string;
  user_id: string;
  is_owner: boolean;
  created_at: string;
}

export interface SubscriptionPayment {
  id: string;
  restaurant_id: string;
  amount: number;
  payment_date: string | null;
  due_date: string;
  status: PaymentStatus;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  // Mercado Pago fields
  mp_payment_id?: string | null;
  mp_external_reference?: string | null;
}

export interface RestaurantWithDetails extends Restaurant {
  reseller?: Reseller | null;
  admins?: RestaurantAdmin[];
  payments?: SubscriptionPayment[];
  plan?: SubscriptionPlan | null;
}
