import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RouteStopRow {
  id: string;
  route_id: string;
  company_id: string;
  seq: number;
  client_name: string | null;
  address: string;
  lat: number | null;
  lon: number | null;
  status: string;
  note: string | null;
  completed_at: string | null;
  created_at: string;
}

async function geocode(address: string): Promise<{ lat: number; lon: number; formatted: string } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address,
    )}&region=br&language=pt-BR&key=${key}`;
    const res = await fetch(url);
    const data = (await res.json()) as any;
    const r = data?.results?.[0];
    if (!r) return null;
    return { lat: r.geometry.location.lat, lon: r.geometry.location.lng, formatted: r.formatted_address };
  } catch {
    return null;
  }
}

export const geocodeAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ address: z.string().min(2).max(300) }).parse(input))
  .handler(async ({ data }) => {
    const r = await geocode(data.address);
    return { ok: !!r, ...r };
  });

export const listRouteStops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ routeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("route_stops")
      .select("*")
      .eq("route_id", data.routeId)
      .order("seq", { ascending: true });
    if (error) {
      console.error("listRouteStops", error);
      return { rows: [] as RouteStopRow[] };
    }
    return { rows: (rows ?? []) as RouteStopRow[] };
  });

const AddStopsSchema = z.object({
  routeId: z.string().uuid(),
  stops: z
    .array(
      z.object({
        clientName: z.string().max(200).optional().nullable(),
        address: z.string().min(2).max(300),
        note: z.string().max(500).optional().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

export const addRouteStops = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AddStopsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: route, error: rErr } = await supabase
      .from("assigned_routes")
      .select("id, company_id")
      .eq("id", data.routeId)
      .single();
    if (rErr || !route) throw new Error("Rota não encontrada");

    const { count } = await supabase
      .from("route_stops")
      .select("id", { count: "exact", head: true })
      .eq("route_id", data.routeId);
    let seq = count ?? 0;

    const rows = [] as any[];
    for (const s of data.stops) {
      seq += 1;
      const g = await geocode(s.address);
      rows.push({
        route_id: data.routeId,
        company_id: route.company_id,
        seq,
        client_name: s.clientName ?? null,
        address: g?.formatted ?? s.address,
        lat: g?.lat ?? null,
        lon: g?.lon ?? null,
        status: "pendente",
        note: s.note ?? null,
      });
    }

    const { error } = await supabase.from("route_stops").insert(rows);
    if (error) throw new Error(error.message);

    await supabase
      .from("assigned_routes")
      .update({ total_deliveries: seq })
      .eq("id", data.routeId);

    return { ok: true, count: rows.length };
  });

export const updateStopStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pendente", "entregue", "falha"]),
        note: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("route_stops")
      .update({
        status: data.status,
        note: data.note ?? null,
        completed_at: data.status === "pendente" ? null : new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Atualiza contagem de entregas concluídas na rota
    const { data: stop } = await supabase
      .from("route_stops")
      .select("route_id")
      .eq("id", data.id)
      .single();
    if (stop) {
      const { count: done } = await supabase
        .from("route_stops")
        .select("id", { count: "exact", head: true })
        .eq("route_id", stop.route_id)
        .eq("status", "entregue");
      await supabase.from("assigned_routes").update({ done: done ?? 0 }).eq("id", stop.route_id);
    }
    return { ok: true };
  });

export const deleteRouteStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("route_stops").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ routeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("assigned_routes")
      .update({ started_at: new Date().toISOString(), status: "em_andamento", finished_at: null })
      .eq("id", data.routeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finishRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ routeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // total de entregas = número de paradas cadastradas (calculado ao finalizar)
    const { count: total } = await supabase
      .from("route_stops")
      .select("id", { count: "exact", head: true })
      .eq("route_id", data.routeId);
    const { count: done } = await supabase
      .from("route_stops")
      .select("id", { count: "exact", head: true })
      .eq("route_id", data.routeId)
      .eq("status", "entregue");

    const now = new Date();
    const arrival = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const { error } = await supabase
      .from("assigned_routes")
      .update({
        finished_at: now.toISOString(),
        status: "concluida",
        expected_return: arrival,
        total_deliveries: total ?? 0,
        done: done ?? 0,
      })
      .eq("id", data.routeId);
    if (error) throw new Error(error.message);
    return { ok: true, total: total ?? 0, arrival };
  });


export const updateRouteLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ routeId: z.string().uuid(), lat: z.number(), lon: z.number() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("assigned_routes")
      .update({ current_lat: data.lat, current_lon: data.lon })
      .eq("id", data.routeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
