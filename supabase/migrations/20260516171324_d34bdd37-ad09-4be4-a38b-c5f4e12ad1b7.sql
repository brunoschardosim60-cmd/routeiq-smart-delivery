-- Tabela de empresas clientes (clientes do admin, ex: Luft)
CREATE TABLE public.client_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  name text NOT NULL,
  daily_admin_rate numeric NOT NULL DEFAULT 0,
  daily_driver_rate numeric NOT NULL DEFAULT 0,
  second_admin_rate numeric NOT NULL DEFAULT 0,
  second_driver_rate numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_select_company ON public.client_companies
  FOR SELECT TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY cc_insert_admin ON public.client_companies
  FOR INSERT TO authenticated
  WITH CHECK (company_id = current_company_id() AND is_company_admin(company_id));

CREATE POLICY cc_update_admin ON public.client_companies
  FOR UPDATE TO authenticated
  USING (is_company_admin(company_id));

CREATE POLICY cc_delete_admin ON public.client_companies
  FOR DELETE TO authenticated
  USING (is_company_admin(company_id));

CREATE TRIGGER tg_client_companies_updated_at
  BEFORE UPDATE ON public.client_companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Colunas novas em assigned_routes
ALTER TABLE public.assigned_routes
  ADD COLUMN client_company_id uuid,
  ADD COLUMN trip_type text NOT NULL DEFAULT 'diaria',
  ADD COLUMN driver_pay numeric NOT NULL DEFAULT 0;

CREATE INDEX idx_assigned_routes_client_company ON public.assigned_routes(client_company_id);
