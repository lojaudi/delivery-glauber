-- Add timezone column to store_config
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo';

-- Add comment explaining the timezone field
COMMENT ON COLUMN public.store_config.timezone IS 'IANA timezone identifier for the restaurant (e.g., America/Sao_Paulo, America/Manaus)';