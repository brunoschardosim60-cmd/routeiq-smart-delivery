import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RecordSchema = z.object({
  assignedRouteId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).nullable().optional(),
  speed: z.number().min(0).max(500).nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  recordedAt: z.string().datetime().optional(),
});

export const recordDriverLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RecordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    const companyId = prof?.company_id;
    if (!companyId) throw new Error("Empresa não encontrada");

    const { error } = await supabase.from("driver_locations").insert({
      company_id: companyId,
      driver_id: userId,
      assigned_route_id: data.assignedRouteId,
      lat: data.lat,
      lon: data.lon,
      accuracy: data.accuracy ?? null,
      speed: data.speed ?? null,
      heading: data.heading ?? null,
      recorded_at: data.recordedAt ?? new Date().toISOString(),
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface TrackPoint {
  lat: number;
  lon: number;
  recorded_at: string;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
}

export const listRouteTrack = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ assignedRouteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("driver_locations")
      .select("lat, lon, recorded_at, speed, heading, accuracy")
      .eq("assigned_route_id", data.assignedRouteId)
      .order("recorded_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    return { points: (rows ?? []) as TrackPoint[] };
  });

export interface ActiveRouteTrack {
  routeId: string;
  code: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string | null;
  originLat: number | null;
  originLon: number | null;
  destinationLat: number | null;
  destinationLon: number | null;
  status: string;
  departure: string | null;
  dateISO: string;
  vehicle: string | null;
  plate: string | null;
  points: TrackPoint[];
}

export const listActiveRoutesTracks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: routes, error: er } = await supabase
      .from("assigned_routes")
      .select("id, code, driver_id, driver_name, origin, destination, status, departure, date_iso, origin_lat, origin_lon, destination_lat, destination_lon")
      .in("status", ["em_andamento", "atrasado"])
      .order("date_iso", { ascending: false });
    if (er) throw new Error(er.message);
    if (!routes || routes.length === 0) return { routes: [] as ActiveRouteTrack[] };

    const driverIds = Array.from(new Set(routes.map((r: any) => r.driver_id)));
    const { data: profs } = await supabase
      .from("driver_profiles")
      .select("user_id, vehicle, plate")
      .in("user_id", driverIds);
    const profMap = new Map<string, { vehicle: string | null; plate: string | null }>();
    for (const p of profs ?? []) {
      profMap.set((p as any).user_id, { vehicle: (p as any).vehicle, plate: (p as any).plate });
    }

    const routeIds = routes.map((r: any) => r.id);
    const { data: locs } = await supabase
      .from("driver_locations")
      .select("assigned_route_id, lat, lon, recorded_at, speed, heading, accuracy")
      .in("assigned_route_id", routeIds)
      .order("recorded_at", { ascending: true })
      .limit(20000);

    const pointsByRoute = new Map<string, TrackPoint[]>();
    for (const l of locs ?? []) {
      const arr = pointsByRoute.get((l as any).assigned_route_id) ?? [];
      arr.push({
        lat: (l as any).lat,
        lon: (l as any).lon,
        recorded_at: (l as any).recorded_at,
        speed: (l as any).speed,
        heading: (l as any).heading,
        accuracy: (l as any).accuracy,
      });
      pointsByRoute.set((l as any).assigned_route_id, arr);
    }

    const out: ActiveRouteTrack[] = routes.map((r: any) => ({
      routeId: r.id,
      code: r.code,
      driverId: r.driver_id,
      driverName: r.driver_name,
      origin: r.origin,
      destination: r.destination,
      originLat: r.origin_lat ?? null,
      originLon: r.origin_lon ?? null,
      destinationLat: r.destination_lat ?? null,
      destinationLon: r.destination_lon ?? null,
      status: r.status,
      departure: r.departure,
      dateISO: r.date_iso,
      vehicle: profMap.get(r.driver_id)?.vehicle ?? null,
      plate: profMap.get(r.driver_id)?.plate ?? null,
      points: pointsByRoute.get(r.id) ?? [],
    }));
    return { routes: out };
  });
