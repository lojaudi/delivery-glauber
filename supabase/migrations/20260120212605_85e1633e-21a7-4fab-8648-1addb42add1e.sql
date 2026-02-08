-- Primeiro, vamos dropar e recriar as políticas de table_orders
DROP POLICY IF EXISTS "Only admins can delete table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Restaurant admins can delete table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Restaurant admins can insert table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Restaurant admins can update table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Table orders are publicly readable" ON public.table_orders;
DROP POLICY IF EXISTS "Waiters can insert table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Waiters can update table orders" ON public.table_orders;

-- Políticas corrigidas para table_orders
CREATE POLICY "Table orders are publicly readable"
ON public.table_orders FOR SELECT
USING (true);

CREATE POLICY "Admins and restaurant admins can insert table orders"
ON public.table_orders FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins and restaurant admins can update table orders"
ON public.table_orders FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins and restaurant admins can delete table orders"
ON public.table_orders FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
);

-- Dropar e recriar políticas de table_order_items
DROP POLICY IF EXISTS "Only admins can delete table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Restaurant admins can delete table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Restaurant admins can insert table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Restaurant admins can update table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Table order items are publicly readable" ON public.table_order_items;
DROP POLICY IF EXISTS "Waiters can insert table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Waiters can update table order items" ON public.table_order_items;

-- Políticas corrigidas para table_order_items
CREATE POLICY "Table order items are publicly readable"
ON public.table_order_items FOR SELECT
USING (true);

CREATE POLICY "Admins and restaurant admins can insert table order items"
ON public.table_order_items FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_table_order(auth.uid(), table_order_id)
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins and restaurant admins can update table order items"
ON public.table_order_items FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_table_order(auth.uid(), table_order_id)
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins and restaurant admins can delete table order items"
ON public.table_order_items FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_table_order(auth.uid(), table_order_id)
);

-- Dropar e recriar políticas de tables
DROP POLICY IF EXISTS "Restaurant admins can delete tables" ON public.tables;
DROP POLICY IF EXISTS "Restaurant admins can insert tables" ON public.tables;
DROP POLICY IF EXISTS "Restaurant admins can update tables" ON public.tables;
DROP POLICY IF EXISTS "Tables are publicly readable" ON public.tables;
DROP POLICY IF EXISTS "Tables are readable by admins" ON public.tables;

-- Políticas corrigidas para tables
CREATE POLICY "Tables are publicly readable"
ON public.tables FOR SELECT
USING (true);

CREATE POLICY "Admins and restaurant admins can insert tables"
ON public.tables FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins and restaurant admins can update tables"
ON public.tables FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins and restaurant admins can delete tables"
ON public.tables FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
);