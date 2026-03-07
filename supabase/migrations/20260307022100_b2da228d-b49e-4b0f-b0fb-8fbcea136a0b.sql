
-- Customers table (auto-aggregated from orders)
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, customer_phone)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages customers"
  ON public.customers FOR ALL
  USING (can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (can_manage_restaurant(auth.uid(), restaurant_id));

-- Campaigns table
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  message text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages campaigns"
  ON public.campaigns FOR ALL
  USING (can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (can_manage_restaurant(auth.uid(), restaurant_id));

-- Campaign recipients table
CREATE TABLE public.campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages campaign recipients"
  ON public.campaign_recipients FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_recipients.campaign_id
    AND can_manage_restaurant(auth.uid(), c.restaurant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_recipients.campaign_id
    AND can_manage_restaurant(auth.uid(), c.restaurant_id)
  ));

-- Function to sync customers from orders
CREATE OR REPLACE FUNCTION public.sync_customer_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.customers (restaurant_id, customer_name, customer_phone, total_orders, total_spent)
  VALUES (NEW.restaurant_id, NEW.customer_name, NEW.customer_phone, 1, NEW.total_amount)
  ON CONFLICT (restaurant_id, customer_phone)
  DO UPDATE SET
    customer_name = NEW.customer_name,
    total_orders = customers.total_orders + 1,
    total_spent = customers.total_spent + NEW.total_amount,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_order_sync_customer
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_customer_from_order();

-- Enable realtime for campaigns
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
