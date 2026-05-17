ALTER TABLE public.assigned_routes
  ADD COLUMN IF NOT EXISTS comprovei_external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS assigned_routes_company_comprovei_uidx
  ON public.assigned_routes (company_id, comprovei_external_id)
  WHERE comprovei_external_id IS NOT NULL;
