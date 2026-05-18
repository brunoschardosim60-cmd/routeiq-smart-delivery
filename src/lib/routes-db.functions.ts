import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateRouteSchema = z.object({
  driverId: z.string().uuid(),
  driverName: z.string().min(1),
  dateISO: z.string().min(1),
  departure: z.string().optional().default(""),
  expectedReturn: z.string().optional().default(""),
  origin: z.string().min(1),
  destination: z.string().optional().nullable(),
  totalDeliveries: z.number().int().min(0).default(0),
  km: z.number().min(0).default(0),
  kmStart: z.number().nullable().optional(),
  kmEnd: z.number().nullable().optional(),
  cost: z.number().min(0).default(0),
  revenue: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export interface RouteDbRow {
  id: string;
  company_id: string;
  driver_id: string;
  driver_name: string;
  code: string;
  date_iso: string;
  departure: string | null;
  expected_return: string | null;
  origin: string;
  destination: string | null;
  total_deliveries: number;
  done: number;
  km: number;
  km_start: number | null;
  km_end: number | null;
  cost: number;
  revenue: number;
  status: string;
  notes: string | null;
  created_at: string;
}

async function getMyCompanyId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return data?.company_id ?? null;
}

export const listAssignedRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("assigned_routes")
      .select("*")
      .order("date_iso", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listAssignedRoutes", error);
      return { rows: [] as RouteDbRow[] };
    }
    return { rows: (data ?? []) as RouteDbRow[] };
  });

export const createAssignedRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateRouteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await getMyCompanyId(supabase, userId);
    if (!companyId) throw new Error("Empresa não encontrada para o usuário");

    const { count } = await supabase
      .from("assigned_routes")
      .select("id", { count: "exact", head: true });
    const seq = (count ?? 0) + 1;
    const code = `RT-A${String(2500 + seq).padStart(4, "0")}`;

    const { data: row, error } = await supabase
      .from("assigned_routes")
      .insert({
        company_id: companyId,
        driver_id: data.driverId,
        driver_name: data.driverName,
        code,
        date_iso: data.dateISO,
        departure: data.departure || null,
        expected_return: data.expectedReturn || null,
        origin: data.destination ? `${data.origin} → ${data.destination}` : data.origin,
        destination: data.destination ?? null,
        total_deliveries: data.totalDeliveries,
        done: 0,
        km: data.km,
        km_start: data.kmStart ?? null,
        km_end: data.kmEnd ?? null,
        cost: data.cost,
        revenue: data.revenue,
        status: "em_andamento",
        notes: data.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as RouteDbRow;
  });

export const deleteAssignedRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("assigned_routes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
