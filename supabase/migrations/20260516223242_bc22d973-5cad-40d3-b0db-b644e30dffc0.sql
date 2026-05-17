
CREATE TABLE public.driver_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  assigned_route_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_locations_route ON public.driver_locations (assigned_route_id, recorded_at);
CREATE INDEX idx_driver_locations_company_recent ON public.driver_locations (company_id, recorded_at DESC);
CREATE INDEX idx_driver_locations_driver_recent ON public.driver_locations (driver_id, recorded_at DESC);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY dl_select_own_or_admin
ON public.driver_locations FOR SELECT TO authenticated
USING ((driver_id = auth.uid()) OR is_company_admin(company_id));

CREATE POLICY dl_insert_self
ON public.driver_locations FOR INSERT TO authenticated
WITH CHECK ((company_id = current_company_id()) AND (driver_id = auth.uid()));

CREATE POLICY dl_delete_admin
ON public.driver_locations FOR DELETE TO authenticated
USING (is_company_admin(company_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;
