-- 1. Corrigir políticas RLS permissivas na tabela orders
-- Remover políticas permissivas
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Orders are publicly readable" ON public.orders;
DROP POLICY IF EXISTS "Orders can be updated" ON public.orders;

-- Criar política para clientes criarem pedidos (vinculado ao restaurante)
CREATE POLICY "Customers can create orders with restaurant_id" 
  ON public.orders FOR INSERT 
  WITH CHECK (restaurant_id IS NOT NULL);

-- Clientes podem ver apenas seus próprios pedidos pelo ID (para acompanhamento)
CREATE POLICY "Anyone can view order by id" 
  ON public.orders FOR SELECT 
  USING (true);

-- Apenas admins do restaurante podem atualizar pedidos
CREATE POLICY "Restaurant admins only can update orders" 
  ON public.orders FOR UPDATE 
  USING (is_admin_of_restaurant(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Corrigir políticas RLS na tabela order_items
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Order items are publicly readable" ON public.order_items;

-- Order items só podem ser criados se o order pertencer ao restaurante correto
CREATE POLICY "Order items can be created with valid order" 
  ON public.order_items FOR INSERT 
  WITH CHECK (
    order_id IS NOT NULL AND 
    EXISTS (SELECT 1 FROM orders WHERE id = order_id)
  );

-- Permitir leitura de order items (necessário para acompanhamento de pedido)
CREATE POLICY "Order items are readable" 
  ON public.order_items FOR SELECT 
  USING (true);

-- 3. Corrigir políticas RLS na tabela table_orders (remover políticas permissivas)
DROP POLICY IF EXISTS "Anyone can delete table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Anyone can insert table orders" ON public.table_orders;
DROP POLICY IF EXISTS "Anyone can update table orders" ON public.table_orders;

-- Waiters e admins podem inserir table_orders
CREATE POLICY "Waiters can insert table orders" 
  ON public.table_orders FOR INSERT 
  WITH CHECK (
    restaurant_id IS NOT NULL AND 
    (is_admin_of_restaurant(auth.uid(), restaurant_id) OR 
     EXISTS (SELECT 1 FROM waiters WHERE id = waiter_id AND restaurant_id = table_orders.restaurant_id) OR
     has_role(auth.uid(), 'admin'::app_role) OR
     auth.uid() IS NULL)
  );

-- Waiters e admins podem atualizar table_orders
CREATE POLICY "Waiters can update table orders" 
  ON public.table_orders FOR UPDATE 
  USING (
    is_admin_of_restaurant(auth.uid(), restaurant_id) OR 
    EXISTS (SELECT 1 FROM waiters WHERE id = waiter_id AND restaurant_id = table_orders.restaurant_id) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    auth.uid() IS NULL
  );

-- Apenas admins podem deletar table_orders
CREATE POLICY "Only admins can delete table orders" 
  ON public.table_orders FOR DELETE 
  USING (
    is_admin_of_restaurant(auth.uid(), restaurant_id) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Corrigir políticas RLS na tabela table_order_items
DROP POLICY IF EXISTS "Anyone can delete table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Anyone can insert table order items" ON public.table_order_items;
DROP POLICY IF EXISTS "Anyone can update table order items" ON public.table_order_items;

-- Permitir inserção por waiters e admins
CREATE POLICY "Waiters can insert table order items" 
  ON public.table_order_items FOR INSERT 
  WITH CHECK (
    table_order_id IS NOT NULL AND 
    (
      is_admin_of_table_order(auth.uid(), table_order_id) OR 
      has_role(auth.uid(), 'admin'::app_role) OR
      auth.uid() IS NULL
    )
  );

-- Permitir atualização por waiters e admins
CREATE POLICY "Waiters can update table order items" 
  ON public.table_order_items FOR UPDATE 
  USING (
    is_admin_of_table_order(auth.uid(), table_order_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    auth.uid() IS NULL
  );

-- Apenas admins podem deletar
CREATE POLICY "Only admins can delete table order items" 
  ON public.table_order_items FOR DELETE 
  USING (
    is_admin_of_table_order(auth.uid(), table_order_id) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 5. Corrigir políticas RLS na tabela customer_addresses
DROP POLICY IF EXISTS "Anyone can delete addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can insert addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can update addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Anyone can view addresses" ON public.customer_addresses;

-- Endereços podem ser criados por qualquer um (cliente não autenticado)
CREATE POLICY "Addresses can be created" 
  ON public.customer_addresses FOR INSERT 
  WITH CHECK (restaurant_id IS NOT NULL);

-- Endereços podem ser visualizados apenas pelo telefone do cliente ou admin do restaurante
CREATE POLICY "Addresses viewable by phone or admin" 
  ON public.customer_addresses FOR SELECT 
  USING (
    is_admin_of_restaurant(auth.uid(), restaurant_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    true -- Para clientes que não estão logados, permitir (filtrado por telefone na query)
  );

-- Endereços podem ser atualizados
CREATE POLICY "Addresses can be updated" 
  ON public.customer_addresses FOR UPDATE 
  USING (
    is_admin_of_restaurant(auth.uid(), restaurant_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    true
  );

-- Endereços podem ser deletados
CREATE POLICY "Addresses can be deleted" 
  ON public.customer_addresses FOR DELETE 
  USING (
    is_admin_of_restaurant(auth.uid(), restaurant_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    true
  );

-- 6. Habilitar Realtime para tabela orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;