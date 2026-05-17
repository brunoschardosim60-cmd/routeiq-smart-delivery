
-- assigned_routes
CREATE TABLE public.assigned_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  driver_name text NOT NULL,
  code text NOT NULL,
  date_iso date NOT NULL,
  departure text,
  expected_return text,
  origin text NOT NULL,
  destination text,
  total_deliveries integer NOT NULL DEFAULT 0,
  done integer NOT NULL DEFAULT 0,
  km numeric NOT NULL DEFAULT 0,
  km_start numeric,
  km_end numeric,
  cost numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'em_andamento',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assigned_routes_company ON public.assigned_routes(company_id, date_iso DESC);
CREATE INDEX idx_assigned_routes_driver ON public.assigned_routes(driver_id, date_iso DESC);

ALTER TABLE public.assigned_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_select_own_or_admin" ON public.assigned_routes
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.is_company_admin(company_id));

CREATE POLICY "ar_insert_self_or_admin" ON public.assigned_routes
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.current_company_id()
    AND (driver_id = auth.uid() OR public.is_company_admin(company_id))
  );

CREATE POLICY "ar_update_own_or_admin" ON public.assigned_routes
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid() OR public.is_company_admin(company_id));

CREATE POLICY "ar_delete_own_or_admin" ON public.assigned_routes
  FOR DELETE TO authenticated
  USING (driver_id = auth.uid() OR public.is_company_admin(company_id));

CREATE TRIGGER tg_assigned_routes_updated
  BEFORE UPDATE ON public.assigned_routes
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- fuel_entries
CREATE TABLE public.fuel_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  driver_name text NOT NULL,
  date_iso date NOT NULL,
  vehicle text,
  plate text,
  liters numeric NOT NULL,
  price_per_l numeric NOT NULL,
  total numeric NOT NULL,
  odometer numeric,
  station text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fuel_entries_company ON public.fuel_entries(company_id, date_iso DESC);
CREATE INDEX idx_fuel_entries_driver ON public.fuel_entries(driver_id, date_iso DESC);

ALTER TABLE public.fuel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fe_select_own_or_admin" ON public.fuel_entries
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.is_company_admin(company_id));

CREATE POLICY "fe_insert_self_or_admin" ON public.fuel_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.current_company_id()
    AND (driver_id = auth.uid() OR public.is_company_admin(company_id))
  );

CREATE POLICY "fe_update_own_or_admin" ON public.fuel_entries
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid() OR public.is_company_admin(company_id));

CREATE POLICY "fe_delete_own_or_admin" ON public.fuel_entries
  FOR DELETE TO authenticated
  USING (driver_id = auth.uid() OR public.is_company_admin(company_id));

CREATE TRIGGER tg_fuel_entries_updated
  BEFORE UPDATE ON public.fuel_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
