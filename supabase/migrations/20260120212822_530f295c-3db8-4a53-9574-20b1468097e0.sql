-- Dropar e recriar políticas de orders
DROP POLICY IF EXISTS "Anyone can view order by id" ON public.orders;
DROP POLICY IF EXISTS "Customers can create orders with restaurant_id" ON public.orders;
DROP POLICY IF EXISTS "Restaurant admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant admins can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant admins only can update orders" ON public.orders;

-- Políticas corrigidas para orders
CREATE POLICY "Orders are publicly readable"
ON public.orders FOR SELECT
USING (true);

CREATE POLICY "Anyone can create orders with restaurant_id"
ON public.orders FOR INSERT
WITH CHECK (restaurant_id IS NOT NULL);

CREATE POLICY "Admins and restaurant admins can update orders"
ON public.orders FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
);

CREATE POLICY "Admins and restaurant admins can delete orders"
ON public.orders FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_admin_of_restaurant(auth.uid(), restaurant_id)
);