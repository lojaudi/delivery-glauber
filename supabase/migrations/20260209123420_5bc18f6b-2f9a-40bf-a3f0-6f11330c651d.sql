
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'delivery', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('money', 'card', 'pix');
CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'reserved', 'requesting_bill');
CREATE TYPE public.table_order_status AS ENUM ('open', 'requesting_bill', 'paid', 'cancelled');
CREATE TYPE public.order_item_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE public.discount_type AS ENUM ('value', 'percentage');
CREATE TYPE public.delivery_fee_mode AS ENUM ('fixed', 'zones');
CREATE TYPE public.coupon_discount_type AS ENUM ('percentage', 'fixed');

-- =============================================
-- 1. RESELLERS
-- =============================================
CREATE TABLE public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  mp_access_token TEXT,
  mp_public_key TEXT,
  mp_webhook_secret TEXT,
  mp_integration_enabled BOOLEAN DEFAULT false,
  primary_color TEXT,
  secondary_color TEXT,
  slug TEXT UNIQUE,
  landing_page_logo TEXT,
  landing_page_title TEXT,
  landing_page_subtitle TEXT,
  landing_page_whatsapp TEXT,
  landing_page_email TEXT,
  landing_page_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. SUBSCRIPTION PLANS
-- =============================================
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 7,
  setup_fee NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  features TEXT[],
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. RESTAURANTS
-- =============================================
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 7,
  setup_fee NUMERIC DEFAULT 0,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  phone TEXT,
  owner_name TEXT,
  contact_email TEXT,
  mp_subscription_id TEXT,
  mp_payer_email TEXT,
  mp_init_point TEXT,
  mp_subscription_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RESTAURANT ADMINS
-- =============================================
CREATE TABLE public.restaurant_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, user_id)
);

ALTER TABLE public.restaurant_admins ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. STORE CONFIG
-- =============================================
CREATE TABLE public.store_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone_whatsapp TEXT,
  pix_key TEXT,
  pix_key_type TEXT,
  logo_url TEXT,
  cover_url TEXT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_fee_mode TEXT NOT NULL DEFAULT 'fixed',
  min_order_value NUMERIC NOT NULL DEFAULT 0,
  address TEXT,
  delivery_time_min INTEGER NOT NULL DEFAULT 30,
  delivery_time_max INTEGER NOT NULL DEFAULT 45,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  pwa_name TEXT,
  pwa_short_name TEXT,
  pix_message TEXT,
  msg_order_accepted TEXT,
  msg_order_preparing TEXT,
  msg_order_delivery TEXT,
  msg_order_completed TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. CATEGORIES
-- =============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. PRODUCTS
-- =============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. ADDON GROUPS
-- =============================================
CREATE TABLE public.addon_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  max_selections INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. ADDON OPTIONS
-- =============================================
CREATE TABLE public.addon_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. PRODUCT ADDON GROUPS (M:N)
-- =============================================
CREATE TABLE public.product_addon_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  UNIQUE(product_id, addon_group_id)
);

ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. ORDERS (delivery)
-- =============================================
CREATE TABLE public.orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address_street TEXT NOT NULL DEFAULT '',
  address_number TEXT NOT NULL DEFAULT '',
  address_neighborhood TEXT NOT NULL DEFAULT '',
  address_complement TEXT,
  address_reference TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'money',
  change_for NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 12. ORDER ITEMS
-- =============================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 13. BUSINESS HOURS
-- =============================================
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  open_time TEXT NOT NULL DEFAULT '08:00',
  close_time TEXT NOT NULL DEFAULT '22:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 14. DELIVERY ZONES
-- =============================================
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  min_order_value NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 15. COUPONS
-- =============================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 16. CUSTOMER ADDRESSES
-- =============================================
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Casa',
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  complement TEXT,
  reference TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 17. TABLES (PDV)
-- =============================================
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  name TEXT,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available',
  current_order_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 18. TABLE ORDERS
-- =============================================
CREATE TABLE public.table_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  waiter_name TEXT,
  waiter_id UUID,
  customer_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'value',
  service_fee_enabled BOOLEAN NOT NULL DEFAULT true,
  service_fee_percentage NUMERIC NOT NULL DEFAULT 10,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.table_orders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 19. TABLE ORDER ITEMS
-- =============================================
CREATE TABLE public.table_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_order_id BIGINT NOT NULL REFERENCES public.table_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  observation TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.table_order_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 20. SUBSCRIPTION PAYMENTS
-- =============================================
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  mp_payment_id TEXT,
  mp_external_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 21. WAITERS
-- =============================================
CREATE TABLE public.waiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  pin TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- =============================================

-- Check if user is a reseller
CREATE OR REPLACE FUNCTION public.is_reseller(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resellers
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- Get reseller_id for a user
CREATE OR REPLACE FUNCTION public.get_reseller_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.resellers
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Check if user is admin of a specific restaurant
CREATE OR REPLACE FUNCTION public.is_restaurant_admin(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_admins
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id
  )
$$;

-- Get restaurant_id for a restaurant admin user
CREATE OR REPLACE FUNCTION public.get_admin_restaurant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.restaurant_admins
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Check if user owns the restaurant (is reseller of the restaurant)
CREATE OR REPLACE FUNCTION public.is_reseller_of_restaurant(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants r
    JOIN public.resellers res ON r.reseller_id = res.id
    WHERE r.id = _restaurant_id AND res.user_id = _user_id AND res.is_active = true
  )
$$;

-- Check if user can manage restaurant (admin or reseller)
CREATE OR REPLACE FUNCTION public.can_manage_restaurant(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_restaurant_admin(_user_id, _restaurant_id)
    OR public.is_reseller_of_restaurant(_user_id, _restaurant_id)
  )
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- RESELLERS: only own data
CREATE POLICY "Resellers can view own data" ON public.resellers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Resellers can update own data" ON public.resellers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Public read for landing pages (by slug)
CREATE POLICY "Public can view reseller by slug" ON public.resellers
  FOR SELECT TO anon
  USING (slug IS NOT NULL AND landing_page_enabled = true);

-- SUBSCRIPTION PLANS: reseller manages, public reads active
CREATE POLICY "Reseller manages own plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (reseller_id = public.get_reseller_id(auth.uid()))
  WITH CHECK (reseller_id = public.get_reseller_id(auth.uid()));

CREATE POLICY "Public can view active plans" ON public.subscription_plans
  FOR SELECT TO anon
  USING (is_active = true);

-- RESTAURANTS: reseller manages, admin reads own, public reads by slug
CREATE POLICY "Reseller manages own restaurants" ON public.restaurants
  FOR ALL TO authenticated
  USING (reseller_id = public.get_reseller_id(auth.uid()))
  WITH CHECK (reseller_id = public.get_reseller_id(auth.uid()));

CREATE POLICY "Admin can view own restaurant" ON public.restaurants
  FOR SELECT TO authenticated
  USING (public.is_restaurant_admin(auth.uid(), id));

CREATE POLICY "Public can view active restaurants by slug" ON public.restaurants
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view active restaurants" ON public.restaurants
  FOR SELECT TO authenticated
  USING (is_active = true);

-- RESTAURANT ADMINS: reseller manages, admin reads own
CREATE POLICY "Reseller manages restaurant admins" ON public.restaurant_admins
  FOR ALL TO authenticated
  USING (public.is_reseller_of_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.is_reseller_of_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Admin can view own admin record" ON public.restaurant_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- STORE CONFIG: admin/reseller manages, public reads
CREATE POLICY "Admin manages store config" ON public.store_config
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view store config" ON public.store_config
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view store config" ON public.store_config
  FOR SELECT TO authenticated
  USING (true);

-- CATEGORIES: admin manages, public reads
CREATE POLICY "Admin manages categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view categories" ON public.categories
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view categories" ON public.categories
  FOR SELECT TO authenticated
  USING (true);

-- PRODUCTS: admin manages, public reads
CREATE POLICY "Admin manages products" ON public.products
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view available products" ON public.products
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view products" ON public.products
  FOR SELECT TO authenticated
  USING (true);

-- ADDON GROUPS: admin manages, public reads
CREATE POLICY "Admin manages addon groups" ON public.addon_groups
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view addon groups" ON public.addon_groups
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view addon groups" ON public.addon_groups
  FOR SELECT TO authenticated
  USING (true);

-- ADDON OPTIONS: admin manages (via group ownership), public reads
CREATE POLICY "Admin manages addon options" ON public.addon_options
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.addon_groups ag 
    WHERE ag.id = group_id AND public.can_manage_restaurant(auth.uid(), ag.restaurant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.addon_groups ag 
    WHERE ag.id = group_id AND public.can_manage_restaurant(auth.uid(), ag.restaurant_id)
  ));

CREATE POLICY "Public can view addon options" ON public.addon_options
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view addon options" ON public.addon_options
  FOR SELECT TO authenticated
  USING (true);

-- PRODUCT ADDON GROUPS: admin manages, public reads
CREATE POLICY "Admin manages product addon groups" ON public.product_addon_groups
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_id AND public.can_manage_restaurant(auth.uid(), p.restaurant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_id AND public.can_manage_restaurant(auth.uid(), p.restaurant_id)
  ));

CREATE POLICY "Public can view product addon groups" ON public.product_addon_groups
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view product addon groups" ON public.product_addon_groups
  FOR SELECT TO authenticated
  USING (true);

-- ORDERS: admin manages, public can insert (place order), public can view own
CREATE POLICY "Admin manages orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Anyone can place orders" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can place orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view orders" ON public.orders
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (true);

-- ORDER ITEMS: follows orders access
CREATE POLICY "Admin manages order items" ON public.order_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_id AND public.can_manage_restaurant(auth.uid(), o.restaurant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_id AND public.can_manage_restaurant(auth.uid(), o.restaurant_id)
  ));

CREATE POLICY "Anyone can insert order items" ON public.order_items
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view order items" ON public.order_items
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (true);

-- BUSINESS HOURS: admin manages, public reads
CREATE POLICY "Admin manages business hours" ON public.business_hours
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view business hours" ON public.business_hours
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view business hours" ON public.business_hours
  FOR SELECT TO authenticated
  USING (true);

-- DELIVERY ZONES: admin manages, public reads
CREATE POLICY "Admin manages delivery zones" ON public.delivery_zones
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view delivery zones" ON public.delivery_zones
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view delivery zones" ON public.delivery_zones
  FOR SELECT TO authenticated
  USING (true);

-- COUPONS: admin manages, public reads active
CREATE POLICY "Admin manages coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view active coupons" ON public.coupons
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (is_active = true);

-- CUSTOMER ADDRESSES: public CRUD (identified by phone)
CREATE POLICY "Anyone can manage customer addresses" ON public.customer_addresses
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can manage customer addresses" ON public.customer_addresses
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- TABLES: admin manages
CREATE POLICY "Admin manages tables" ON public.tables
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

-- TABLE ORDERS: admin manages
CREATE POLICY "Admin manages table orders" ON public.table_orders
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

-- TABLE ORDER ITEMS: follows table_orders access
CREATE POLICY "Admin manages table order items" ON public.table_order_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.table_orders t 
    WHERE t.id = table_order_id AND public.can_manage_restaurant(auth.uid(), t.restaurant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.table_orders t 
    WHERE t.id = table_order_id AND public.can_manage_restaurant(auth.uid(), t.restaurant_id)
  ));

-- SUBSCRIPTION PAYMENTS: reseller manages
CREATE POLICY "Reseller manages payments" ON public.subscription_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = restaurant_id AND r.reseller_id = public.get_reseller_id(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = restaurant_id AND r.reseller_id = public.get_reseller_id(auth.uid())
  ));

-- WAITERS: admin manages
CREATE POLICY "Admin manages waiters" ON public.waiters
  FOR ALL TO authenticated
  USING (public.can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.can_manage_restaurant(auth.uid(), restaurant_id));

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_order_items;

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON public.resellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_config_updated_at BEFORE UPDATE ON public.store_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_table_orders_updated_at BEFORE UPDATE ON public.table_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON public.tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX idx_restaurants_reseller ON public.restaurants(reseller_id);
CREATE INDEX idx_restaurant_admins_user ON public.restaurant_admins(user_id);
CREATE INDEX idx_restaurant_admins_restaurant ON public.restaurant_admins(restaurant_id);
CREATE INDEX idx_products_restaurant ON public.products(restaurant_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_categories_restaurant ON public.categories(restaurant_id);
CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_tables_restaurant ON public.tables(restaurant_id);
CREATE INDEX idx_table_orders_restaurant ON public.table_orders(restaurant_id);
CREATE INDEX idx_table_order_items_order ON public.table_order_items(table_order_id);
CREATE INDEX idx_business_hours_restaurant ON public.business_hours(restaurant_id);
CREATE INDEX idx_delivery_zones_restaurant ON public.delivery_zones(restaurant_id);
CREATE INDEX idx_coupons_restaurant ON public.coupons(restaurant_id);
CREATE INDEX idx_waiters_restaurant ON public.waiters(restaurant_id);
CREATE INDEX idx_subscription_payments_restaurant ON public.subscription_payments(restaurant_id);
CREATE INDEX idx_resellers_user ON public.resellers(user_id);
CREATE INDEX idx_resellers_slug ON public.resellers(slug);
CREATE INDEX idx_store_config_restaurant ON public.store_config(restaurant_id);
CREATE INDEX idx_addon_groups_restaurant ON public.addon_groups(restaurant_id);
CREATE INDEX idx_addon_options_group ON public.addon_options(group_id);
CREATE INDEX idx_customer_addresses_phone ON public.customer_addresses(customer_phone);
