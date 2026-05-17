
-- Driver profile per company: editable rates and vehicle/CNH info
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  daily_rate numeric NOT NULL DEFAULT 0,
  second_trip_rate numeric NOT NULL DEFAULT 0,
  monthly_target integer NOT NULL DEFAULT 0,
  vehicle text,
  plate text,
  cnh text,
  phone text,
  cpf text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY dp_select_self_or_admin ON public.driver_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_admin(company_id));

CREATE POLICY dp_insert_self_or_admin ON public.driver_profiles
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id()
    AND (user_id = auth.uid() OR public.is_company_admin(company_id)));

CREATE POLICY dp_update_self_or_admin ON public.driver_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_company_admin(company_id));

CREATE POLICY dp_delete_admin ON public.driver_profiles
  FOR DELETE TO authenticated
  USING (public.is_company_admin(company_id));

CREATE TRIGGER trg_driver_profiles_touch
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Storage bucket for delivery proof photos (used by Task #3)
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "delivery_proofs_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'delivery-proofs');

CREATE POLICY "delivery_proofs_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "delivery_proofs_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'delivery-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Column to link a finished route to its proof photo URL
ALTER TABLE public.assigned_routes
  ADD COLUMN IF NOT EXISTS proof_photo_url text;

-- Enable realtime broadcasts on assigned_routes for admin notifications (Task #2)
ALTER PUBLICATION supabase_realtime ADD TABLE public.assigned_routes;
