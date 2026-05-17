
-- Deny-all explícito para frontend (service-role bypass RLS)
CREATE POLICY "deny_all_driver_comprovei_credentials"
  ON public.driver_comprovei_credentials
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- Mesma política para comprovei_config (configuração global, só admin via server)
CREATE POLICY "deny_all_comprovei_config"
  ON public.comprovei_config
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
