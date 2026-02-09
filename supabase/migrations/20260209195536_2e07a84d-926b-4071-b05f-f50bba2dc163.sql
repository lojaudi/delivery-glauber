
-- Add kitchen_pin columns to store_config
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS kitchen_pin text;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS kitchen_pin_enabled boolean NOT NULL DEFAULT false;

-- Create communication_logs table
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'manual',
  message text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reseller manages communication logs" ON public.communication_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = communication_logs.restaurant_id
      AND r.reseller_id = get_reseller_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = communication_logs.restaurant_id
      AND r.reseller_id = get_reseller_id(auth.uid())
    )
  );

CREATE INDEX idx_communication_logs_restaurant ON public.communication_logs(restaurant_id);
