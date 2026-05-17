import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Lista pública (id, name, slug) usada no signup para escolher a empresa
export const listPublicCompanies = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, name, slug")
    .order("name");
  if (error) throw new Error(error.message);
  return { companies: data ?? [] };
});
