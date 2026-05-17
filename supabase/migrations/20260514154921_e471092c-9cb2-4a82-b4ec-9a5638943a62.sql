-- Enum de papéis
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'motorista');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- current_company_id
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- is_company_admin: dono OU admin da empresa do usuário logado
CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND company_id = _company_id
      AND role IN ('owner','admin')
  )
$$;

-- Trigger updated_at (reusa tg_touch_updated_at já existente)
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Trigger handle_new_user: cria profile + (se owner) company + role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_company_id uuid;
  v_company_name text;
  v_company_slug text;
  v_full_name text;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'motorista');

  IF v_role = 'owner' THEN
    v_company_name := NEW.raw_user_meta_data->>'company_name';
    v_company_slug := lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'company_slug', v_company_name), '[^a-z0-9]+', '-', 'g'));
    INSERT INTO public.companies (name, slug, owner_id)
      VALUES (v_company_name, v_company_slug, NEW.id)
      RETURNING id INTO v_company_id;
  ELSE
    v_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id','')::uuid;
  END IF;

  INSERT INTO public.profiles (id, company_id, full_name)
    VALUES (NEW.id, v_company_id, v_full_name);

  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, company_id, role)
      VALUES (NEW.id, v_company_id, v_role);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS companies
CREATE POLICY companies_select_public ON public.companies
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY companies_update_owner ON public.companies
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY companies_delete_owner ON public.companies
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- RLS profiles
CREATE POLICY profiles_select_self_or_company_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_company_admin(company_id));
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- RLS user_roles
CREATE POLICY user_roles_select_self_or_company_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_admin(company_id));
