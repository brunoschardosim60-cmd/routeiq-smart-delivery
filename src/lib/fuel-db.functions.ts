import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateFuelSchema = z.object({
  driverId: z.string().uuid().optional(),
  driverName: z.string().min(1),
  dateISO: z.string().min(1),
  vehicle: z.string().optional().nullable(),
  plate: z.string().optional().nullable(),
  liters: z.number().positive(),
  pricePerL: z.number().positive(),
  odometer: z.number().nullable().optional(),
  station: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedRouteId: z.string().uuid().nullable().optional(),
});

export interface FuelDbRow {
  id: string;
  company_id: string;
  driver_id: string;
  driver_name: string;
  date_iso: string;
  vehicle: string | null;
  plate: string | null;
  liters: number;
  price_per_l: number;
  total: number;
  odometer: number | null;
  station: string | null;
  notes: string | null;
  created_at: string;
  assigned_route_id: string | null;
}

async function getMyCompanyId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return data?.company_id ?? null;
}

export const listFuelEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("fuel_entries")
      .select("*")
      .order("date_iso", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listFuelEntries", error);
      return { rows: [] as FuelDbRow[] };
    }
    return { rows: (data ?? []) as FuelDbRow[] };
  });

export const createFuelEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateFuelSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await getMyCompanyId(supabase, userId);
    if (!companyId) throw new Error("Empresa não encontrada para o usuário");
    const driverId = data.driverId ?? userId;
    const total = +(data.liters * data.pricePerL).toFixed(2);

    const { data: row, error } = await supabase
      .from("fuel_entries")
      .insert({
        company_id: companyId,
        driver_id: driverId,
        driver_name: data.driverName,
        date_iso: data.dateISO,
        vehicle: data.vehicle ?? null,
        plate: data.plate ?? null,
        liters: data.liters,
        price_per_l: data.pricePerL,
        total,
        odometer: data.odometer ?? null,
        station: data.station ?? null,
        notes: data.notes ?? null,
        assigned_route_id: data.assignedRouteId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as FuelDbRow;
  });

export const deleteFuelEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("fuel_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
