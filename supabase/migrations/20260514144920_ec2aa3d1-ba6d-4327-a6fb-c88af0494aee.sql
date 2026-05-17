
-- Habilita pgcrypto para criptografia simétrica
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de credenciais Comprovei por motorista
CREATE TABLE public.driver_comprovei_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- driver_id: hoje aponta para drivers mockados (drv-1, drv-2...).
  -- Quando trocar para Supabase Auth, basta mapear auth.uid() -> driver_id.
  driver_id TEXT NOT NULL UNIQUE,
  comprovei_user TEXT NOT NULL,
  -- Senha criptografada via pgp_sym_encrypt + chave do secret COMPROVEI_ENCRYPTION_KEY
  password_encrypted BYTEA NOT NULL,
  sync_active BOOLEAN NOT NULL DEFAULT true,
  last_event_id TEXT,
  last_sync_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'idle',
  last_message TEXT,
  events_synced INTEGER NOT NULL DEFAULT 0,
  routes_synced INTEGER NOT NULL DEFAULT 0,
  stops_synced INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_comprovei_credentials ENABLE ROW LEVEL SECURITY;

-- Sem policies: tabela acessível apenas via service-role (server functions).
-- Frontend NUNCA lê essa tabela diretamente — sempre via server fn que mascara senha.

-- Adiciona driver_id às tabelas Comprovei para isolamento por motorista
ALTER TABLE public.comprovei_events ADD COLUMN IF NOT EXISTS driver_id TEXT;
ALTER TABLE public.comprovei_routes ADD COLUMN IF NOT EXISTS driver_id TEXT;
ALTER TABLE public.comprovei_stops ADD COLUMN IF NOT EXISTS driver_id TEXT;

CREATE INDEX IF NOT EXISTS idx_comprovei_events_driver ON public.comprovei_events (driver_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_comprovei_routes_driver ON public.comprovei_routes (driver_id);
CREATE INDEX IF NOT EXISTS idx_comprovei_stops_driver ON public.comprovei_stops (driver_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_driver_comprovei_credentials_updated
  BEFORE UPDATE ON public.driver_comprovei_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
