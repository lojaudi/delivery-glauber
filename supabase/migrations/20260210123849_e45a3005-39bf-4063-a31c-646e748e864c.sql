
-- Allow public to read active waiters (for waiter login screen)
CREATE POLICY "Public can view active waiters"
ON public.waiters
FOR SELECT
USING (is_active = true);

-- Allow public to read tables (for waiter dashboard)
CREATE POLICY "Public can view tables"
ON public.tables
FOR SELECT
USING (true);

-- Allow public to read open table orders (for waiter dashboard)
CREATE POLICY "Public can view table orders"
ON public.table_orders
FOR SELECT
USING (true);

-- Allow public to insert table orders (waiter opens table)
CREATE POLICY "Public can insert table orders"
ON public.table_orders
FOR INSERT
WITH CHECK (true);

-- Allow public to update table orders (waiter manages order)
CREATE POLICY "Public can update table orders"
ON public.table_orders
FOR UPDATE
USING (true);

-- Allow public to read table order items
CREATE POLICY "Public can view table order items"
ON public.table_order_items
FOR SELECT
USING (true);

-- Allow public to insert table order items (waiter adds items)
CREATE POLICY "Public can insert table order items"
ON public.table_order_items
FOR INSERT
WITH CHECK (true);

-- Allow public to update table order items (waiter/kitchen updates status)
CREATE POLICY "Public can update table order items"
ON public.table_order_items
FOR UPDATE
USING (true);

-- Allow public to update tables (status changes when opening/closing)
CREATE POLICY "Public can update tables"
ON public.tables
FOR UPDATE
USING (true);
