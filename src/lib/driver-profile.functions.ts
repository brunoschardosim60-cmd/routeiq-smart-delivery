import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DriverProfileRow {
  user_id: string;
  company_id: string;
  daily_rate: number;
  second_trip_rate: number;
  monthly_target: number;
  vehicle: string | null;
  plate: string | null;
  cnh: string | null;
  phone: string | null;
  cpf: string | null;
}

async function getMyCompanyId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return data?.company_id ?? null;
}

export const listDriverProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("driver_profiles").select("*");
    if (error) {
      console.error("listDriverProfiles", error);
      return { rows: [] as DriverProfileRow[] };
    }
    return { rows: (data ?? []) as DriverProfileRow[] };
  });

export const getMyDriverProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("driver_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return { row: (data ?? null) as DriverProfileRow | null };
  });

const UpsertSchema = z.object({
  userId: z.string().uuid(),
  dailyRate: z.number().min(0).default(0),
  secondTripRate: z.number().min(0).default(0),
  monthlyTarget: z.number().int().min(0).default(0),
  vehicle: z.string().nullable().optional(),
  plate: z.string().nullable().optional(),
  cnh: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
});

export const upsertDriverProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await getMyCompanyId(supabase, userId);
    if (!companyId) throw new Error("Empresa não encontrada");

    const payload = {
      user_id: data.userId,
      company_id: companyId,
      daily_rate: data.dailyRate,
      second_trip_rate: data.secondTripRate,
      monthly_target: data.monthlyTarget,
      vehicle: data.vehicle ?? null,
      plate: data.plate ? data.plate.toUpperCase() : null,
      cnh: data.cnh ?? null,
      phone: data.phone ?? null,
      cpf: data.cpf ?? null,
    };
    const { error } = await supabase
      .from("driver_profiles")
      .upsert(payload as never, { onConflict: "user_id,company_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
