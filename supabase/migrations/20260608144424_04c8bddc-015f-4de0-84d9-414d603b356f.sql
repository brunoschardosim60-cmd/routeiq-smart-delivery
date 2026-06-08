-- 1. Remover tudo do Comprovei
DROP TABLE IF EXISTS public.comprovei_sync_log CASCADE;
DROP TABLE IF EXISTS public.comprovei_sync_state CASCADE;
DROP TABLE IF EXISTS public.comprovei_process_times CASCADE;
DROP TABLE IF EXISTS public.comprovei_route_avg CASCADE;
DROP TABLE IF EXISTS public.comprovei_events CASCADE;
DROP TABLE IF EXISTS public.comprovei_config CASCADE;
DROP TABLE IF EXISTS public.comprovei_route_window CASCADE;
DROP TABLE IF EXISTS public.comprovei_routes CASCADE;
DROP TABLE IF EXISTS public.comprovei_stops CASCADE;
DROP TABLE IF EXISTS public.driver_comprovei_credentials CASCADE;

DROP INDEX IF EXISTS public.assigned_routes_company_comprovei_uidx;
ALTER TABLE public.assigned_routes DROP COLUMN IF EXISTS comprovei_external_id;

-- 2. Colunas de navegação ao vivo na rota
ALTER TABLE public.assigned_routes
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_lat double precision,
  ADD COLUMN IF NOT EXISTS current_lon double precision;

-- 3. Função de updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. Tabela de paradas de entrega
CREATE TABLE public.route_stops (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id uuid NOT NULL REFERENCES public.assigned_routes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  seq integer NOT NULL DEFAULT 1,
  client_name text,
  address text NOT NULL,
  lat double precision,
  lon double precision,
  status text NOT NULL DEFAULT 'pendente',
  note text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_stops TO authenticated;
GRANT ALL ON public.route_stops TO service_role;

ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rs_select_own_or_admin" ON public.route_stops
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assigned_routes ar
    WHERE ar.id = route_stops.route_id
      AND (ar.driver_id = auth.uid() OR public.is_company_admin(ar.company_id))
  ));

CREATE POLICY "rs_insert_own_or_admin" ON public.route_stops
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.assigned_routes ar
      WHERE ar.id = route_stops.route_id
        AND (ar.driver_id = auth.uid() OR public.is_company_admin(ar.company_id))
    )
  );

CREATE POLICY "rs_update_own_or_admin" ON public.route_stops
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assigned_routes ar
    WHERE ar.id = route_stops.route_id
      AND (ar.driver_id = auth.uid() OR public.is_company_admin(ar.company_id))
  ));

CREATE POLICY "rs_delete_own_or_admin" ON public.route_stops
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assigned_routes ar
    WHERE ar.id = route_stops.route_id
      AND (ar.driver_id = auth.uid() OR public.is_company_admin(ar.company_id))
  ));

CREATE INDEX idx_route_stops_route ON public.route_stops(route_id, seq);

CREATE TRIGGER update_route_stops_updated_at
  BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();