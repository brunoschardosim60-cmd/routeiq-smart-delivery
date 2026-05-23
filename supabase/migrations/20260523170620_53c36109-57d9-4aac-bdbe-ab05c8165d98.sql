CREATE OR REPLACE FUNCTION public.admin_get_schema_sql()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_is_admin boolean;
  v_out text := '';
  r record;
  c record;
  p record;
  cols text;
  pk text;
BEGIN
  -- só admins/owners podem ler o schema
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  v_out := '-- Schema export gerado em ' || now()::text || E'\n';
  v_out := v_out || E'-- Lovable Cloud — schema public\n\n';

  FOR r IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    cols := '';
    FOR c IN
      SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.table_name
      ORDER BY ordinal_position
    LOOP
      cols := cols || E'  ' || quote_ident(c.column_name) || ' ' ||
        CASE
          WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
          WHEN c.data_type = 'ARRAY' THEN c.udt_name
          WHEN c.data_type = 'character varying' AND c.character_maximum_length IS NOT NULL
            THEN 'varchar(' || c.character_maximum_length || ')'
          ELSE c.data_type
        END ||
        CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END ||
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        E',\n';
    END LOOP;

    -- primary key
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY array_position(i.indkey::int[], a.attnum))
      INTO pk
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ('public.' || quote_ident(r.table_name))::regclass
      AND i.indisprimary;

    IF pk IS NOT NULL THEN
      cols := cols || E'  PRIMARY KEY (' || pk || E')\n';
    ELSE
      -- remove última vírgula
      cols := rtrim(cols, E',\n') || E'\n';
    END IF;

    v_out := v_out || '-- ─── Table: ' || r.table_name || E' ────────────────────\n';
    v_out := v_out || 'CREATE TABLE IF NOT EXISTS public.' || quote_ident(r.table_name) || E' (\n' || cols || E');\n\n';
    v_out := v_out || 'ALTER TABLE public.' || quote_ident(r.table_name) || E' ENABLE ROW LEVEL SECURITY;\n\n';

    -- políticas RLS
    FOR p IN
      SELECT policyname, cmd, permissive, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = r.table_name
      ORDER BY policyname
    LOOP
      v_out := v_out || 'CREATE POLICY ' || quote_ident(p.policyname) ||
        ' ON public.' || quote_ident(r.table_name) ||
        ' AS ' || p.permissive ||
        ' FOR ' || p.cmd ||
        ' TO ' || array_to_string(p.roles, ', ') ||
        CASE WHEN p.qual IS NOT NULL THEN E'\n  USING (' || p.qual || ')' ELSE '' END ||
        CASE WHEN p.with_check IS NOT NULL THEN E'\n  WITH CHECK (' || p.with_check || ')' ELSE '' END ||
        E';\n';
    END LOOP;
    v_out := v_out || E'\n';
  END LOOP;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_schema_sql() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_schema_sql() TO authenticated;