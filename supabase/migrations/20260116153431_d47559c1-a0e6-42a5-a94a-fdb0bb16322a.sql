-- Adicionar colunas na tabela resellers para configuração da landing page
ALTER TABLE public.resellers 
ADD COLUMN IF NOT EXISTS landing_page_logo TEXT,
ADD COLUMN IF NOT EXISTS landing_page_title TEXT DEFAULT 'Cardápio Digital Completo',
ADD COLUMN IF NOT EXISTS landing_page_subtitle TEXT DEFAULT 'Venda mais, pague menos taxas',
ADD COLUMN IF NOT EXISTS landing_page_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS landing_page_email TEXT,
ADD COLUMN IF NOT EXISTS landing_page_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Adicionar colunas na tabela subscription_plans para funcionalidades
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS features TEXT[],
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;

-- Criar índice único para o slug do revendedor
CREATE UNIQUE INDEX IF NOT EXISTS resellers_slug_idx ON public.resellers(slug) WHERE slug IS NOT NULL;