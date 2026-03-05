
ALTER TABLE public.subscription_plans
  ADD COLUMN max_products integer DEFAULT NULL,
  ADD COLUMN max_categories integer DEFAULT NULL,
  ADD COLUMN max_orders_per_month integer DEFAULT NULL;
