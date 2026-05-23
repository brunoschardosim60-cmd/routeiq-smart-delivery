import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ALLOWED_TABLES = [
  "assigned_routes",
  "client_companies",
  "companies",
  "comprovei_config",
  "comprovei_events",
  "comprovei_process_times",
  "comprovei_route_avg",
  "comprovei_route_window",
  "comprovei_routes",
  "comprovei_stops",
  "comprovei_sync_log",
  "comprovei_sync_state",
  "driver_comprovei_credentials",
  "driver_locations",
  "driver_profiles",
  "fuel_entries",
  "profiles",
  "user_roles",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

async function requireAdmin() {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const authHeader = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Unauthorized");

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  const userId = userData.user?.id;
  if (error || !userId) throw new Error("Unauthorized");

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const isAdmin = (roles ?? []).some((r) => r.role === "owner" || r.role === "admin");
  if (!isAdmin) throw new Error("Forbidden: admin only");

  return { supabaseAdmin, userId };
}

// ─── Listar recursos disponíveis ───────────────────────────────────────────
export const listExportResources = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return {
    tables: ALLOWED_TABLES as readonly string[],
  };
});

// ─── Exportar tabela ───────────────────────────────────────────────────────
export const exportTable = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ table: z.enum(ALLOWED_TABLES as unknown as [AllowedTable, ...AllowedTable[]]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await requireAdmin();
    const rows: any[] = [];
    let from = 0;
    const pageSize = 1000;
    // paginação para passar do limite de 1000
    // (até 100k linhas por segurança)
    for (let i = 0; i < 100; i++) {
      const { data: page, error } = await supabaseAdmin
        .from(data.table)
        .select("*")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!page || page.length === 0) break;
      rows.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
    return { rows };
  });

// ─── Exportar usuários do Auth ─────────────────────────────────────────────
export const exportAuthUsers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await requireAdmin();
  const rows: any[] = [];
  let page = 1;
  for (let i = 0; i < 100; i++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    if (users.length === 0) break;
    rows.push(
      ...users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        provider: u.app_metadata?.provider,
        full_name: (u.user_metadata as any)?.full_name ?? null,
      })),
    );
    if (users.length < 1000) break;
    page++;
  }
  return { rows };
});

// ─── Exportar buckets e objetos do Storage ─────────────────────────────────
export const exportStorage = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await requireAdmin();
  const { data: buckets, error: be } = await supabaseAdmin.storage.listBuckets();
  if (be) throw new Error(be.message);

  const objects: any[] = [];
  for (const b of buckets ?? []) {
    const walk = async (prefix: string) => {
      const { data: items, error } = await supabaseAdmin.storage
        .from(b.id)
        .list(prefix, { limit: 1000 });
      if (error) return;
      for (const it of items ?? []) {
        const fullPath = prefix ? `${prefix}/${it.name}` : it.name;
        if ((it as any).id === null || it.metadata == null) {
          // folder
          await walk(fullPath);
        } else {
          objects.push({
            bucket: b.id,
            path: fullPath,
            size: (it.metadata as any)?.size ?? null,
            mimetype: (it.metadata as any)?.mimetype ?? null,
            created_at: it.created_at,
            updated_at: it.updated_at,
          });
        }
      }
    };
    await walk("");
  }

  return {
    buckets: (buckets ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      public: b.public,
      created_at: b.created_at,
      updated_at: b.updated_at,
    })),
    objects,
  };
});

// ─── Exportar SQL (CREATE TABLE + RLS) ─────────────────────────────────────
export const exportSchemaSql = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await requireAdmin();
  const { data, error } = await supabaseAdmin.rpc("admin_get_schema_sql");
  if (error) throw new Error(error.message);
  return { sql: (data as string) ?? "" };
});
