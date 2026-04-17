
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_weight_based boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_from_catalog boolean NOT NULL DEFAULT false;
