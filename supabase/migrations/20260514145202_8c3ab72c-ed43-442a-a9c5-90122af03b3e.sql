
-- Salva/atualiza credenciais com senha criptografada
CREATE OR REPLACE FUNCTION public.set_driver_comprovei_credentials(
  p_driver_id TEXT,
  p_user TEXT,
  p_password TEXT,
  p_key TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.driver_comprovei_credentials (driver_id, comprovei_user, password_encrypted)
  VALUES (p_driver_id, p_user, pgp_sym_encrypt(p_password, p_key))
  ON CONFLICT (driver_id) DO UPDATE
    SET comprovei_user = EXCLUDED.comprovei_user,
        password_encrypted = EXCLUDED.password_encrypted,
        sync_active = true,
        updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_driver_comprovei_credentials(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Lê credenciais com senha descriptografada (uso server-only)
CREATE OR REPLACE FUNCTION public.get_driver_comprovei_credentials_decrypted(
  p_driver_id TEXT,
  p_key TEXT
) RETURNS TABLE (
  driver_id TEXT,
  comprovei_user TEXT,
  password TEXT,
  sync_active BOOLEAN,
  last_event_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.driver_id,
         c.comprovei_user,
         pgp_sym_decrypt(c.password_encrypted, p_key)::TEXT,
         c.sync_active,
         c.last_event_id
  FROM public.driver_comprovei_credentials c
  WHERE c.driver_id = p_driver_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_driver_comprovei_credentials_decrypted(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Lê todas as credenciais ativas (para job de sync)
CREATE OR REPLACE FUNCTION public.list_active_driver_comprovei_credentials_decrypted(
  p_key TEXT
) RETURNS TABLE (
  driver_id TEXT,
  comprovei_user TEXT,
  password TEXT,
  last_event_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.driver_id,
         c.comprovei_user,
         pgp_sym_decrypt(c.password_encrypted, p_key)::TEXT,
         c.last_event_id
  FROM public.driver_comprovei_credentials c
  WHERE c.sync_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.list_active_driver_comprovei_credentials_decrypted(TEXT) FROM PUBLIC, anon, authenticated;
