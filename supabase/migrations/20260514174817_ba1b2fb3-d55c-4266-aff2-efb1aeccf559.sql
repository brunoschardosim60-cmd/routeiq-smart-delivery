TRUNCATE TABLE
  public.user_roles,
  public.profiles,
  public.companies,
  public.comprovei_events,
  public.comprovei_routes,
  public.comprovei_stops,
  public.comprovei_process_times,
  public.comprovei_route_avg,
  public.comprovei_route_window,
  public.comprovei_sync_log,
  public.comprovei_sync_state,
  public.driver_comprovei_credentials
CASCADE;
DELETE FROM auth.users;