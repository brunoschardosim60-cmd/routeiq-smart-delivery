
-- 1) Restrict companies SELECT (no public listing)
DROP POLICY IF EXISTS companies_select_public ON public.companies;
CREATE POLICY companies_select_members
  ON public.companies FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR id = public.current_company_id());

-- 2) Helper: is the caller an admin/owner of ANY company
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_any_admin() FROM anon;

-- 3) Lock down cross-company comprovei tables to admins only
DROP POLICY IF EXISTS comprovei_routes_read ON public.comprovei_routes;
CREATE POLICY comprovei_routes_read ON public.comprovei_routes
  FOR SELECT TO authenticated USING (public.is_any_admin());

DROP POLICY IF EXISTS comprovei_stops_read ON public.comprovei_stops;
CREATE POLICY comprovei_stops_read ON public.comprovei_stops
  FOR SELECT TO authenticated USING (public.is_any_admin());

DROP POLICY IF EXISTS comprovei_events_read ON public.comprovei_events;
CREATE POLICY comprovei_events_read ON public.comprovei_events
  FOR SELECT TO authenticated USING (public.is_any_admin());

DROP POLICY IF EXISTS comprovei_process_times_read ON public.comprovei_process_times;
CREATE POLICY comprovei_process_times_read ON public.comprovei_process_times
  FOR SELECT TO authenticated USING (public.is_any_admin());

DROP POLICY IF EXISTS comprovei_route_avg_read ON public.comprovei_route_avg;
CREATE POLICY comprovei_route_avg_read ON public.comprovei_route_avg
  FOR SELECT TO authenticated USING (public.is_any_admin());

DROP POLICY IF EXISTS comprovei_route_window_read ON public.comprovei_route_window;
CREATE POLICY comprovei_route_window_read ON public.comprovei_route_window
  FOR SELECT TO authenticated USING (public.is_any_admin());

DROP POLICY IF EXISTS comprovei_sync_state_read ON public.comprovei_sync_state;
CREATE POLICY comprovei_sync_state_read ON public.comprovei_sync_state
  FOR SELECT TO authenticated USING (public.is_any_admin());

DROP POLICY IF EXISTS comprovei_sync_log_read ON public.comprovei_sync_log;
CREATE POLICY comprovei_sync_log_read ON public.comprovei_sync_log
  FOR SELECT TO authenticated USING (public.is_any_admin());

-- 4) Explicit deny for user_roles writes from clients (only server/service role manages roles)
CREATE POLICY user_roles_no_client_insert ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY user_roles_no_client_update ON public.user_roles
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY user_roles_no_client_delete ON public.user_roles
  FOR DELETE TO authenticated USING (false);

-- 5) Revoke EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_get_schema_sql() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_driver_comprovei_credentials(text, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_driver_comprovei_credentials_decrypted(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.list_active_driver_comprovei_credentials_decrypted(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_touch_updated_at() FROM anon, authenticated, public;

-- 6) Make delivery-proofs bucket private and scope SELECT to auth+folder owner
UPDATE storage.buckets SET public = false WHERE id = 'delivery-proofs';
DROP POLICY IF EXISTS delivery_proofs_public_read ON storage.objects;
CREATE POLICY delivery_proofs_select_own_or_admin ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'delivery-proofs'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.is_any_admin()
    )
  );
