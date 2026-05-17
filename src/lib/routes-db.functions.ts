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
  clientCompanyId: z.string().uuid().nullable().optional(),
  tripType: z.enum(["diaria", "segunda", "avulsa"]).optional().default("diaria"),
  driverPay: z.number().min(0).optional().default(0),
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
  client_company_id: string | null;
  trip_type: "diaria" | "segunda" | "avulsa" | string;
  driver_pay: number;
  proof_photo_url?: string | null;
  comprovei_external_id?: string | null;
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
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
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
        client_company_id: data.clientCompanyId ?? null,
        trip_type: data.tripType ?? "diaria",
        driver_pay: data.driverPay ?? 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as RouteDbRow;
  });

const FinishSchema = z.object({
  id: z.string().uuid(),
  kmEnd: z.number().min(0).nullable().optional(),
  notes: z.string().optional().nullable(),
  proofPhotoUrl: z.string().url().nullable().optional(),
});

export const finishAssignedRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FinishSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existing, error: e1 } = await supabase
      .from("assigned_routes")
      .select("km_start, total_deliveries, notes, driver_id, date_iso, client_company_id, trip_type, revenue, driver_pay")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);

    const kmStart = existing?.km_start != null ? Number(existing.km_start) : null;
    const kmEnd = data.kmEnd ?? null;
    const km =
      kmStart != null && kmEnd != null && kmEnd >= kmStart ? kmEnd - kmStart : undefined;

    let tripType: "diaria" | "segunda" | "avulsa" = (existing?.trip_type as any) ?? "diaria";
    let revenue = Number(existing?.revenue ?? 0);
    let driverPay = Number(existing?.driver_pay ?? 0);

    if (tripType !== "avulsa") {
      const { count: doneToday } = await supabase
        .from("assigned_routes")
        .select("id", { count: "exact", head: true })
        .eq("driver_id", existing.driver_id)
        .eq("date_iso", existing.date_iso)
        .eq("status", "concluido")
        .neq("id", data.id);
      const isSecond = (doneToday ?? 0) >= 1;
      tripType = isSecond ? "segunda" : "diaria";

      if (existing?.client_company_id) {
        const { data: cli } = await supabase
          .from("client_companies")
          .select("daily_admin_rate, daily_driver_rate, second_admin_rate, second_driver_rate")
          .eq("id", existing.client_company_id)
          .maybeSingle();
        if (cli) {
          revenue = isSecond ? Number(cli.second_admin_rate) : Number(cli.daily_admin_rate);
          driverPay = isSecond ? Number(cli.second_driver_rate) : Number(cli.daily_driver_rate);
        }
      }
    }

    const cost = driverPay;

    const patch: Record<string, unknown> = {
      status: "concluido",
      km_end: kmEnd,
      done: existing?.total_deliveries ?? 0,
      trip_type: tripType,
      revenue,
      driver_pay: driverPay,
      cost,
    };
    if (km !== undefined) patch.km = km;
    if (data.notes) {
      patch.notes = [existing?.notes, data.notes].filter(Boolean).join("\n");
    }
    if (data.proofPhotoUrl) patch.proof_photo_url = data.proofPhotoUrl;

    const { data: row, error } = await supabase
      .from("assigned_routes")
      .update(patch as never)
      .eq("id", data.id)
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

const UpdateSchema = z.object({
  id: z.string().uuid(),
  revenue: z.number().min(0).optional(),
  driverPay: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  km: z.number().min(0).optional(),
  kmEnd: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateAssignedRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: Record<string, unknown> = {};
    if (data.revenue !== undefined) patch.revenue = data.revenue;
    if (data.driverPay !== undefined) patch.driver_pay = data.driverPay;
    if (data.cost !== undefined) patch.cost = data.cost;
    if (data.km !== undefined) patch.km = data.km;
    if (data.kmEnd !== undefined) patch.km_end = data.kmEnd;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("assigned_routes").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recalcRoutesForClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ clientCompanyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cli, error: ecli } = await supabase
      .from("client_companies")
      .select("daily_admin_rate, daily_driver_rate, second_admin_rate, second_driver_rate")
      .eq("id", data.clientCompanyId)
      .maybeSingle();
    if (ecli) throw new Error(ecli.message);
    if (!cli) throw new Error("Empresa cliente não encontrada");

    const { data: routes, error: er } = await supabase
      .from("assigned_routes")
      .select("id, driver_id, date_iso, trip_type, status")
      .eq("client_company_id", data.clientCompanyId)
      .eq("status", "concluido")
      .order("date_iso", { ascending: true })
      .order("created_at", { ascending: true });
    if (er) throw new Error(er.message);

    const counts = new Map<string, number>();
    let updated = 0;
    for (const r of routes ?? []) {
      if (r.trip_type === "avulsa") continue;
      const key = `${r.driver_id}|${r.date_iso}`;
      const idx = counts.get(key) ?? 0;
      counts.set(key, idx + 1);
      const isSecond = idx >= 1;
      const revenue = isSecond ? Number(cli.second_admin_rate) : Number(cli.daily_admin_rate);
      const driverPay = isSecond ? Number(cli.second_driver_rate) : Number(cli.daily_driver_rate);
      const tripType = isSecond ? "segunda" : "diaria";
      const { error: eu } = await supabase
        .from("assigned_routes")
        .update({ revenue, driver_pay: driverPay, cost: driverPay, trip_type: tripType })
        .eq("id", r.id);
      if (!eu) updated++;
    }
    return { updated, total: routes?.length ?? 0 };
  });

export const updateRouteCoords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      lat: z.number().min(-90).max(90).optional(),
      lon: z.number().min(-180).max(180).optional(),
      originLat: z.number().min(-90).max(90).optional(),
      originLon: z.number().min(-180).max(180).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: Record<string, unknown> = {};
    if (data.lat != null && data.lon != null) {
      patch.destination_lat = data.lat;
      patch.destination_lon = data.lon;
    }
    if (data.originLat != null && data.originLon != null) {
      patch.origin_lat = data.originLat;
      patch.origin_lon = data.originLon;
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase
      .from("assigned_routes")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
