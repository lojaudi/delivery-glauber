-- Tabela para armazenar leads/prospects que vem da landing page
CREATE TABLE IF NOT EXISTS public.landing_page_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  business_type TEXT,
  status TEXT DEFAULT 'pending',
  mp_payment_id TEXT,
  mp_payment_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

-- Policy for resellers to view their own leads
CREATE POLICY "Resellers can view their own leads"
ON public.landing_page_leads
FOR SELECT
USING (
  reseller_id IN (
    SELECT id FROM public.resellers WHERE user_id = auth.uid()
  )
);

-- Policy for resellers to update their own leads
CREATE POLICY "Resellers can update their own leads"
ON public.landing_page_leads
FOR UPDATE
USING (
  reseller_id IN (
    SELECT id FROM public.resellers WHERE user_id = auth.uid()
  )
);

-- Policy for anyone to insert leads (from landing page)
CREATE POLICY "Anyone can create leads"
ON public.landing_page_leads
FOR INSERT
WITH CHECK (true);

-- Campos adicionais para o revendedor (depoimentos, FAQ, stats)
ALTER TABLE public.resellers ADD COLUMN IF NOT EXISTS landing_testimonials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resellers ADD COLUMN IF NOT EXISTS landing_faq JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resellers ADD COLUMN IF NOT EXISTS landing_stats JSONB DEFAULT '{}'::jsonb;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_landing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_landing_page_leads_updated_at
BEFORE UPDATE ON public.landing_page_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_landing_leads_updated_at();

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_page_leads;