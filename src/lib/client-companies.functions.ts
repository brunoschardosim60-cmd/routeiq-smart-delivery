import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ClientCompanyRow {
  id: string;
  company_id: string;
  name: string;
  daily_admin_rate: number;
  daily_driver_rate: number;
  second_admin_rate: number;
  second_driver_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  dailyAdminRate: z.number().min(0).default(0),
  dailyDriverRate: z.number().min(0).default(0),
  secondAdminRate: z.number().min(0).default(0),
  secondDriverRate: z.number().min(0).default(0),
  active: z.boolean().default(true),
});

async function myCompanyId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return data?.company_id ?? null;
}

export const listClientCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("client_companies")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("listClientCompanies", error);
      return { rows: [] as ClientCompanyRow[] };
    }
    return { rows: (data ?? []) as ClientCompanyRow[] };
  });

export const upsertClientCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await myCompanyId(supabase, userId);
    if (!companyId) throw new Error("Empresa não encontrada");

    const payload = {
      company_id: companyId,
      name: data.name,
      daily_admin_rate: data.dailyAdminRate,
      daily_driver_rate: data.dailyDriverRate,
      second_admin_rate: data.secondAdminRate,
      second_driver_rate: data.secondDriverRate,
      active: data.active,
    };

    if (data.id) {
      const { data: row, error } = await supabase
        .from("client_companies")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row as ClientCompanyRow;
    }
    const { data: row, error } = await supabase
      .from("client_companies")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as ClientCompanyRow;
  });

export const deleteClientCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("client_companies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
