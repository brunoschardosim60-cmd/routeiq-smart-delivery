import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emptyAuthContext = () => ({
  userId: null as string | null,
  profile: null as { id: string; company_id: string | null; full_name: string | null; avatar_url: string | null } | null,
  company: null as { id: string; name: string; slug: string } | null,
  roles: [] as ("owner" | "admin" | "motorista")[],
});

// Retorna o contexto do usuário logado: profile + empresa + papéis
export const getMyContext = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const authHeader = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) return emptyAuthContext();

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    const userId = userData.user?.id;

    if (userError || !userId) return emptyAuthContext();

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, company_id, full_name, avatar_url").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role, company_id").eq("user_id", userId),
    ]);

    let company: { id: string; name: string; slug: string } | null = null;
    if (profile?.company_id) {
      const { data } = await supabaseAdmin
        .from("companies")
        .select("id, name, slug")
        .eq("id", profile.company_id)
        .maybeSingle();
      company = data ?? null;
    }

    return {
      userId,
      profile: profile ?? null,
      company,
      roles: (roles ?? []).map((r) => r.role as "owner" | "admin" | "motorista"),
    };
  });

const SlugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-zA-Z0-9 _-]+$/, "Slug pode conter apenas letras, números, espaço, hífen e underscore");

// Verifica se um slug de empresa está disponível (usado no signup do dono)
export const checkCompanySlug = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ slug: SlugSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const slug = data.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const { data: existing } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    return { available: !existing, slug };
  });
