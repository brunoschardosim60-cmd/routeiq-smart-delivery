ALTER TABLE public.fuel_entries ADD COLUMN IF NOT EXISTS assigned_route_id uuid;
CREATE INDEX IF NOT EXISTS idx_fuel_entries_assigned_route_id ON public.fuel_entries(assigned_route_id);
CREATE INDEX IF NOT EXISTS idx_assigned_routes_client_company_id ON public.assigned_routes(client_company_id);
CREATE INDEX IF NOT EXISTS idx_assigned_routes_company_status ON public.assigned_routes(company_id, status);