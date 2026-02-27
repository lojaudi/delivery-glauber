
CREATE TABLE public.whatsapp_notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id bigint NOT NULL,
  phone text NOT NULL,
  instance_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own restaurant logs"
  ON public.whatsapp_notification_logs
  FOR SELECT
  USING (can_manage_restaurant(auth.uid(), restaurant_id));

-- Service role inserts via edge function, no INSERT policy needed for regular users

-- Index for fast queries
CREATE INDEX idx_whatsapp_logs_restaurant_id ON public.whatsapp_notification_logs(restaurant_id, sent_at DESC);
