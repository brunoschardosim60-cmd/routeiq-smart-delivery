import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runComproveiSyncJob } from "./comprovei.server";

// =================================================================
// READ: Config (mascara senha)
// =================================================================
export const getComproveiConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("comprovei_config")
    .select("id, enabled, base_events_url, base_api_url, username, sync_interval_minutes, updated_at, password")
    .limit(1)
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    enabled: data.enabled,
    baseEventsUrl: data.base_events_url,
    baseApiUrl: data.base_api_url,
    username: data.username ?? "",
    syncIntervalMinutes: data.sync_interval_minutes,
    updatedAt: data.updated_at,
    passwordSet: !!data.password,
  };
});

// =================================================================
// WRITE: Config
// =================================================================
const SaveConfigSchema = z.object({
  enabled: z.boolean(),
  baseEventsUrl: z.string().url().min(1),
  baseApiUrl: z.string().url().min(1),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(), // se vazio, mantém a anterior
  syncIntervalMinutes: z.number().int().min(2).max(60),
});

export const saveComproveiConfig = createServerFn({ method: "POST" })
  .inputValidator((input) => SaveConfigSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: current, error: readErr } = await supabaseAdmin
      .from("comprovei_config")
      .select("id, password")
      .limit(1)
      .single();
    if (readErr) throw new Error(readErr.message);

    const update = {
      enabled: data.enabled,
      base_events_url: data.baseEventsUrl,
      base_api_url: data.baseApiUrl,
      username: data.username ?? null,
      password: data.password && data.password.length > 0 ? data.password : current.password,
      sync_interval_minutes: data.syncIntervalMinutes,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from("comprovei_config").update(update).eq("id", current.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================================================================
// READ: Sync state + log
// =================================================================
export const getComproveiSyncState = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: state }, { data: log }, { count: routesCount }, { count: stopsCount }, { count: eventsCount }] =
    await Promise.all([
      supabaseAdmin.from("comprovei_sync_state").select("*").limit(1).single(),
      supabaseAdmin.from("comprovei_sync_log").select("*").order("started_at", { ascending: false }).limit(20),
      supabaseAdmin.from("comprovei_routes").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("comprovei_stops").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("comprovei_events").select("*", { count: "exact", head: true }),
    ]);
    return {
      state: state
        ? {
            lastEventId: state.last_event_id,
            lastSyncAt: state.last_sync_at,
            lastStatus: state.last_status,
            lastMessage: state.last_message,
            eventsSynced: state.events_synced,
            routesSynced: state.routes_synced,
            stopsSynced: state.stops_synced,
          }
        : null,
      log: (log ?? []).map((l) => ({
        id: l.id,
        startedAt: l.started_at,
        finishedAt: l.finished_at,
        status: l.status,
        trigger: l.trigger,
        eventsCount: l.events_count,
        routesCount: l.routes_count,
        stopsCount: l.stops_count,
        message: l.message,
      })),
      totals: {
        routes: routesCount ?? 0,
        stops: stopsCount ?? 0,
        events: eventsCount ?? 0,
      },
    };
});

// =================================================================
// READ: dados Comprovei (rotas, paradas, eventos)
// =================================================================
export const getComproveiRoutes = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("comprovei_routes")
    .select("*")
    .order("planned_start", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data;
});

export const getComproveiStops = createServerFn({ method: "GET" })
  .inputValidator((input: { routeExternalId?: string }) => input)
  .handler(async ({ data }) => {
    let q = supabaseAdmin.from("comprovei_stops").select("*").order("sequence_planned", { ascending: true }).limit(200);
    if (data.routeExternalId) q = q.eq("route_external_id", data.routeExternalId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows;
  });

export const getComproveiRecentEvents = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("comprovei_events")
    .select("id, event_type, occurred_at, route_external_id, stop_external_id, payload")
    .order("occurred_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data;
});

// =================================================================
// SYNC trigger (manual)
// =================================================================
export const runComproveiSync = createServerFn({ method: "POST" })
  .inputValidator((input: { trigger?: "manual" | "auto" }) => input)
  .handler(async ({ data }) => {
    return runComproveiSyncJob(data.trigger ?? "manual");
  });

// =================================================================
// TEST connection
// =================================================================
export const testComproveiConnection = createServerFn({ method: "POST" }).handler(async () => {
  const { data: cfg, error } = await supabaseAdmin
    .from("comprovei_config")
    .select("base_events_url, username, password")
    .limit(1)
    .single();
  if (error) throw new Error(error.message);

  if (!cfg.username || !cfg.password) {
    return { ok: false, message: "Credenciais não configuradas." };
  }
  try {
    const auth = "Basic " + btoa(`${cfg.username}:${cfg.password}`);
    const res = await fetch(`${cfg.base_events_url}/events?qtd=1`, {
      method: "GET",
      headers: { Authorization: auth, Accept: "application/json" },
    });
    return {
      ok: res.ok,
      status: res.status,
      message: res.ok
        ? "Conexão estabelecida com sucesso."
        : `Falha (${res.status}): ${res.statusText}`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro de rede" };
  }
});
