import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// READ: histórico de sync logs (paginado simples)
const LogsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  trigger: z.enum(["all", "manual", "auto"]).optional(),
  status: z.enum(["all", "ok", "error", "partial"]).optional(),
});
export const getComproveiSyncLogs = createServerFn({ method: "GET" })
  .inputValidator((input) => LogsSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("comprovei_sync_log")
      .select("id, started_at, finished_at, status, trigger, events_count, routes_count, stops_count, message")
      .order("started_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.trigger && data.trigger !== "all") q = q.eq("trigger", data.trigger);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      status: r.status,
      trigger: r.trigger,
      eventsCount: r.events_count,
      routesCount: r.routes_count,
      stopsCount: r.stops_count,
      message: r.message,
    }));
  });

// READ: alertas — motoristas com sync em erro ou parados há mais de N min
const AlertSchema = z.object({
  staleMinutes: z.number().int().min(1).max(1440).optional(),
});
export const getComproveiAlerts = createServerFn({ method: "GET" })
  .inputValidator((input) => AlertSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const stale = data.staleMinutes ?? 30;
    const { data: rows } = await supabaseAdmin
      .from("driver_comprovei_credentials")
      .select("driver_id, comprovei_user, sync_active, last_sync_at, last_status, last_message")
      .eq("sync_active", true);
    const now = Date.now();
    const alerts = (rows ?? [])
      .map((r) => {
        const ageMin = r.last_sync_at
          ? Math.floor((now - new Date(r.last_sync_at).getTime()) / 60000)
          : null;
        const isError = r.last_status === "error";
        const isStale = ageMin === null || ageMin > stale;
        if (!isError && !isStale) return null;
        return {
          driverId: r.driver_id,
          comproveiUser: r.comprovei_user,
          lastStatus: r.last_status,
          lastMessage: r.last_message,
          lastSyncAt: r.last_sync_at,
          ageMinutes: ageMin,
          severity: isError ? ("error" as const) : ("warning" as const),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return { alerts, staleMinutes: stale };
  });
