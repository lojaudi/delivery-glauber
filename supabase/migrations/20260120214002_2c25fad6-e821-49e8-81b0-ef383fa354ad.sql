-- Add helper function: reseller owns restaurant
CREATE OR REPLACE FUNCTION public.is_reseller_of_restaurant(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = _restaurant_id
      AND r.reseller_id = public.get_user_reseller_id(_user_id)
  )
$$;

-- ORDERS (delivery orders)
DROP POLICY IF EXISTS "Admins and restaurant admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and restaurant admins can delete orders" ON public.orders;

CREATE POLICY "Admins, restaurant admins and resellers can update orders"
ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can delete orders"
ON public.orders
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- TABLES
DROP POLICY IF EXISTS "Admins and restaurant admins can insert tables" ON public.tables;
DROP POLICY IF EXISTS "Admins and restaurant admins can update tables" ON public.tables;
DROP POLICY IF EXISTS "Admins and restaurant admins can delete tables" ON public.tables;

CREATE POLICY "Admins, restaurant admins and resellers can insert tables"
ON public.tables
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can update tables"
ON public.tables
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins, restaurant admins and resellers can delete tables"
ON public.tables
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- TABLE_ORDERS
DROP POLICY IF EXISTS "Admins and restaurant admins can insert table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Admins and restaurant admins can update table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Admins and restaurant admins can delete table orders" ON public.table_orders;

CREATE POLICY "Admins, restaurant admins and resellers can insert table orders"
ON public.table_orders
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins, restaurant admins and resellers can update table orders"
ON public.table_orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins, restaurant admins and resellers can delete table orders"
ON public.table_orders
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- TABLE_ORDER_ITEMS
DROP POLICY IF EXISTS "Admins and restaurant admins can insert table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Admins and restaurant admins can update table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Admins and restaurant admins can delete table order items" ON public.table_order_items;

CREATE POLICY "Admins, restaurant admins and resellers can insert table order items"
ON public.table_order_items
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_table_order(auth.uid(), table_order_id)
  OR public.is_reseller_of_restaurant(auth.uid(), public.get_restaurant_id_from_table((SELECT tor.table_id FROM public.table_orders tor WHERE tor.id = table_order_id LIMIT 1)))
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins, restaurant admins and resellers can update table order items"
ON public.table_order_items
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_table_order(auth.uid(), table_order_id)
  OR public.is_reseller_of_restaurant(auth.uid(), public.get_restaurant_id_from_table((SELECT tor.table_id FROM public.table_orders tor WHERE tor.id = table_order_id LIMIT 1)))
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins, restaurant admins and resellers can delete table order items"
ON public.table_order_items
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_table_order(auth.uid(), table_order_id)
  OR public.is_reseller_of_restaurant(auth.uid(), public.get_restaurant_id_from_table((SELECT tor.table_id FROM public.table_orders tor WHERE tor.id = table_order_id LIMIT 1)))
);

-- PRODUCT/SETTINGS TABLES (restaurant-scoped management)
-- PRODUCTS
DROP POLICY IF EXISTS "Restaurant admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Restaurant admins can update products" ON public.products;
DROP POLICY IF EXISTS "Restaurant admins can delete products" ON public.products;

CREATE POLICY "Admins, restaurant admins and resellers can insert products"
ON public.products FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can update products"
ON public.products FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can delete products"
ON public.products FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- CATEGORIES
DROP POLICY IF EXISTS "Restaurant admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Restaurant admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Restaurant admins can delete categories" ON public.categories;

CREATE POLICY "Admins, restaurant admins and resellers can insert categories"
ON public.categories FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can update categories"
ON public.categories FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can delete categories"
ON public.categories FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- ADDON_GROUPS
DROP POLICY IF EXISTS "Restaurant admins can insert addon groups" ON public.addon_groups;
DROP POLICY IF EXISTS "Restaurant admins can update addon groups" ON public.addon_groups;
DROP POLICY IF EXISTS "Restaurant admins can delete addon groups" ON public.addon_groups;

CREATE POLICY "Admins, restaurant admins and resellers can insert addon groups"
ON public.addon_groups FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can update addon groups"
ON public.addon_groups FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can delete addon groups"
ON public.addon_groups FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- BUSINESS_HOURS
DROP POLICY IF EXISTS "Restaurant admins can insert business hours" ON public.business_hours;
DROP POLICY IF EXISTS "Restaurant admins can update business hours" ON public.business_hours;
DROP POLICY IF EXISTS "Restaurant admins can delete business hours" ON public.business_hours;

CREATE POLICY "Admins, restaurant admins and resellers can insert business hours"
ON public.business_hours FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can update business hours"
ON public.business_hours FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can delete business hours"
ON public.business_hours FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- COUPONS
DROP POLICY IF EXISTS "Restaurant admins can insert coupons" ON public.coupons;
DROP POLICY IF EXISTS "Restaurant admins can update coupons" ON public.coupons;
DROP POLICY IF EXISTS "Restaurant admins can delete coupons" ON public.coupons;

CREATE POLICY "Admins, restaurant admins and resellers can insert coupons"
ON public.coupons FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can update coupons"
ON public.coupons FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can delete coupons"
ON public.coupons FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- DELIVERY_ZONES
DROP POLICY IF EXISTS "Restaurant admins can insert delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Restaurant admins can update delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Restaurant admins can delete delivery zones" ON public.delivery_zones;

CREATE POLICY "Admins, restaurant admins and resellers can insert delivery zones"
ON public.delivery_zones FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can update delivery zones"
ON public.delivery_zones FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can delete delivery zones"
ON public.delivery_zones FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- WAITERS
DROP POLICY IF EXISTS "Restaurant admins can insert waiters" ON public.waiters;
DROP POLICY IF EXISTS "Restaurant admins can update waiters" ON public.waiters;
DROP POLICY IF EXISTS "Restaurant admins can delete waiters" ON public.waiters;

CREATE POLICY "Admins, restaurant admins and resellers can insert waiters"
ON public.waiters FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can update waiters"
ON public.waiters FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins, restaurant admins and resellers can delete waiters"
ON public.waiters FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR public.is_reseller_of_restaurant(auth.uid(), restaurant_id)
);

-- STORE_CONFIG (already has reseller policies, but ensure restaurant admin + system admin can insert/update too)
-- (Keep existing policies; just add missing ones if they were removed in the past)
DROP POLICY IF EXISTS "Restaurant admins can insert store config" ON public.store_config;
DROP POLICY IF EXISTS "Restaurant admins can update store config" ON public.store_config;

CREATE POLICY "Admins, restaurant admins and resellers can insert store config"
ON public.store_config FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (restaurant_id IS NOT NULL AND is_admin_of_restaurant(auth.uid(), restaurant_id))
  OR (restaurant_id IS NOT NULL AND public.is_reseller_of_restaurant(auth.uid(), restaurant_id))
);

CREATE POLICY "Admins, restaurant admins and resellers can update store config"
ON public.store_config FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (restaurant_id IS NOT NULL AND is_admin_of_restaurant(auth.uid(), restaurant_id))
  OR (restaurant_id IS NOT NULL AND public.is_reseller_of_restaurant(auth.uid(), restaurant_id))
);
