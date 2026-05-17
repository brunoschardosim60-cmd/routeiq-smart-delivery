import { createServerFn } from "@tanstack/react-start";

export const listCompanyMembers = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const authHeader = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { members: [] as Member[] };

  const { data: u } = await supabaseAdmin.auth.getUser(token);
  const uid = u.user?.id;
  if (!uid) return { members: [] as Member[] };

  const { data: me } = await supabaseAdmin
    .from("profiles").select("company_id").eq("id", uid).maybeSingle();
  if (!me?.company_id) return { members: [] as Member[] };

  const { data: profiles } = await supabaseAdmin
    .from("profiles").select("id, full_name, company_id, created_at")
    .eq("company_id", me.company_id);

  const ids = (profiles ?? []).map((p) => p.id);
  const rolesRes = ids.length
    ? await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
    : { data: [] as { user_id: string; role: string }[] };

  const roleByUser = new Map<string, string[]>();
  (rolesRes.data ?? []).forEach((r) => {
    const a = roleByUser.get(r.user_id) ?? [];
    a.push(r.role);
    roleByUser.set(r.user_id, a);
  });

  const members: Member[] = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    created_at: p.created_at,
    roles: roleByUser.get(p.id) ?? [],
  }));
  return { members };
});

export interface Member {
  id: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
}
