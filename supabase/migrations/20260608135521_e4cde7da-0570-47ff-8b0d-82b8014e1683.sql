CREATE OR REPLACE FUNCTION public.set_driver_comprovei_credentials(p_driver_id text, p_user text, p_password text, p_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_driver_comprovei_credentials_decrypted(p_driver_id text, p_key text)
 RETURNS TABLE(driver_id text, comprovei_user text, password text, sync_active boolean, last_event_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.list_active_driver_comprovei_credentials_decrypted(p_key text)
 RETURNS TABLE(driver_id text, comprovei_user text, password text, last_event_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT c.driver_id,
         c.comprovei_user,
         pgp_sym_decrypt(c.password_encrypted, p_key)::TEXT,
         c.last_event_id
  FROM public.driver_comprovei_credentials c
  WHERE c.sync_active = true;
END;
$function$;