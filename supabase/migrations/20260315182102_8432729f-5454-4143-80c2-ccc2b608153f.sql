
-- Create drivers table
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  pin text,
  is_active boolean NOT NULL DEFAULT true,
  is_online boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create delivery_assignments table
CREATE TABLE public.delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  picked_up_at timestamp with time zone,
  delivered_at timestamp with time zone,
  rejected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages drivers" ON public.drivers
  FOR ALL TO authenticated
  USING (can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view active drivers" ON public.drivers
  FOR SELECT TO public
  USING (is_active = true);

-- RLS for delivery_assignments
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages delivery assignments" ON public.delivery_assignments
  FOR ALL TO authenticated
  USING (can_manage_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (can_manage_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Public can view delivery assignments" ON public.delivery_assignments
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Public can update delivery assignments" ON public.delivery_assignments
  FOR UPDATE TO public
  USING (true);

CREATE POLICY "Public can insert delivery assignments" ON public.delivery_assignments
  FOR INSERT TO public
  WITH CHECK (true);

-- Enable realtime for delivery_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_assignments;

-- Trigger for updated_at on delivery_assignments
CREATE TRIGGER set_updated_at_delivery_assignments
  BEFORE UPDATE ON public.delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
