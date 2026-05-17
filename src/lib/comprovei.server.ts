// Lógica server-only de sincronização com o Comprovei
// Híbrido: se a integração estiver ativa E houver credenciais, chama as APIs reais
// usando Basic Auth. Caso contrário, gera dados mock incrementais para demonstração.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface ComproveiConfigRow {
  enabled: boolean;
  base_events_url: string;
  base_api_url: string;
  username: string | null;
  password: string | null;
}

async function loadConfig(): Promise<ComproveiConfigRow> {
  const { data, error } = await supabaseAdmin
    .from("comprovei_config")
    .select("enabled, base_events_url, base_api_url, username, password")
    .limit(1)
    .single();
  if (error) throw new Error(error.message);
  return data as ComproveiConfigRow;
}

function basicAuth(username: string, password: string) {
  return "Basic " + btoa(`${username}:${password}`);
}

interface SyncResult {
  ok: boolean;
  events: number;
  routes: number;
  stops: number;
  message: string;
  lastEventId?: string | null;
}

export async function runComproveiSyncJob(trigger: "manual" | "auto"): Promise<SyncResult> {
  const startedAt = new Date().toISOString();

  // Marca state em "running"
  await supabaseAdmin
    .from("comprovei_sync_state")
    .update({ last_status: "running", last_message: "Sincronizando…", updated_at: startedAt })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  let events = 0;
  let routes = 0;
  let stops = 0;
  let message = "";
  let lastEventId: string | null = null;
  let ok = true;

  try {
    const cfg = await loadConfig();

    const { data: stateRow } = await supabaseAdmin
      .from("comprovei_sync_state")
      .select("last_event_id")
      .limit(1)
      .single();
    const fromEventId = stateRow?.last_event_id ?? null;

    if (cfg.enabled && cfg.username && cfg.password) {
      // ====== Modo REAL: chamadas às APIs Comprovei ======
      const auth = basicAuth(cfg.username, cfg.password);

      // WS205 — Events
      const eventsUrl = `${cfg.base_events_url}/events?qtd=100${fromEventId ? `&eventId=${encodeURIComponent(fromEventId)}` : ""}`;
      const evRes = await fetch(eventsUrl, { headers: { Authorization: auth, Accept: "application/json" } });
      if (!evRes.ok) throw new Error(`WS205 falhou (${evRes.status})`);
      const evJson = (await evRes.json()) as { events?: Array<Record<string, unknown>> };
      const evList = evJson.events ?? [];
      for (const e of evList) {
        const id = String(e.id ?? e.eventId ?? "");
        if (!id) continue;
        await supabaseAdmin.from("comprovei_events").upsert({
          id,
          event_type: String(e.type ?? "unknown"),
          occurred_at: (e.occurredAt as string) ?? null,
          route_external_id: (e.routeId as string) ?? null,
          stop_external_id: (e.stopId as string) ?? null,
          payload: e as never,
        });
        lastEventId = id;
        events++;
      }

      // WS601 — Routes
      const rtRes = await fetch(`${cfg.base_api_url}/api/1.1/util/export/route`, {
        method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: "{}",
      });
      if (rtRes.ok) {
        const rtJson = (await rtRes.json()) as { routes?: Array<Record<string, unknown>> };
        for (const r of rtJson.routes ?? []) {
          const externalId = String(r.id ?? r.routeId ?? "");
          if (!externalId) continue;
          await supabaseAdmin.from("comprovei_routes").upsert({
            external_id: externalId,
            driver_name: r.driver as string,
            vehicle: r.vehicle as string,
            plate: r.plate as string,
            origin: r.origin as string,
            destination: r.destination as string,
            status: r.status as string,
            distance_estimated_km: (r.distanceEstimated as number) ?? null,
            distance_traveled_km: (r.distanceTraveled as number) ?? null,
            delivery_count: (r.deliveryCount as number) ?? null,
            planned_start: (r.plannedStart as string) ?? null,
            planned_end: (r.plannedEnd as string) ?? null,
            in_transit_at: (r.inTransitAt as string) ?? null,
            arrived_base_at: (r.arrivedBaseAt as string) ?? null,
            raw: r as never,
            updated_at: new Date().toISOString(),
          });
          routes++;
        }
      }

      // WS605 — Stops
      const stRes = await fetch(`${cfg.base_api_url}/api/1.1/util/export/documentStop`, {
        method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: "{}",
      });
      if (stRes.ok) {
        const stJson = (await stRes.json()) as { stops?: Array<Record<string, unknown>> };
        for (const s of stJson.stops ?? []) {
          const externalId = String(s.id ?? s.stopId ?? "");
          if (!externalId) continue;
          await supabaseAdmin.from("comprovei_stops").upsert({
            external_id: externalId,
            route_external_id: (s.routeId as string) ?? null,
            recipient: s.recipient as string,
            address: s.address as string,
            sequence_planned: (s.sequencePlanned as number) ?? null,
            sequence_executed: (s.sequenceExecuted as number) ?? null,
            status: s.status as string,
            occurrence: s.occurrence as string,
            scheduled_at: (s.scheduledAt as string) ?? null,
            done_at: (s.doneAt as string) ?? null,
            distance_traveled_km: (s.distanceTraveled as number) ?? null,
            photo_url: (s.photoUrl as string) ?? null,
            signature_url: (s.signatureUrl as string) ?? null,
            tracking_url: (s.trackingUrl as string) ?? null,
            raw: s as never,
            updated_at: new Date().toISOString(),
          });
          stops++;
        }
      }

      message = `Sync real concluída — ${events} eventos, ${routes} rotas, ${stops} paradas.`;
    } else {
      // ====== Modo MOCK (híbrido): gera 1-3 eventos sintéticos para mostrar atividade ======
      const synthetic = Math.floor(Math.random() * 3) + 1;
      const baseId = Date.now();
      for (let i = 0; i < synthetic; i++) {
        const id = `mock-${baseId}-${i}`;
        await supabaseAdmin.from("comprovei_events").upsert({
          id,
          event_type: ["stop.delivered", "route.updated", "stop.attempted"][i % 3],
          occurred_at: new Date().toISOString(),
          route_external_id: ["CMP-RT-1001", "CMP-RT-1002"][i % 2],
          payload: { synthetic: true },
        });
        lastEventId = id;
        events++;
      }
      message = cfg.enabled
        ? `Sync mock — credenciais não configuradas. ${events} eventos sintéticos gerados.`
        : `Sync mock — integração desativada. ${events} eventos sintéticos gerados.`;
    }
  } catch (e) {
    ok = false;
    message = e instanceof Error ? e.message : "Falha desconhecida";
  }

  const finishedAt = new Date().toISOString();

  // Atualiza state
  const updates: Record<string, unknown> = {
    last_sync_at: finishedAt,
    last_status: ok ? "ok" : "error",
    last_message: message,
    updated_at: finishedAt,
  };
  if (lastEventId) updates.last_event_id = lastEventId;

  // Acumula contadores
  const { data: prev } = await supabaseAdmin
    .from("comprovei_sync_state")
    .select("id, events_synced, routes_synced, stops_synced")
    .limit(1)
    .single();
  if (prev) {
    updates.events_synced = (prev.events_synced ?? 0) + events;
    updates.routes_synced = (prev.routes_synced ?? 0) + routes;
    updates.stops_synced = (prev.stops_synced ?? 0) + stops;
    await supabaseAdmin.from("comprovei_sync_state").update(updates as never).eq("id", prev.id);
  }

  // Log
  await supabaseAdmin.from("comprovei_sync_log").insert({
    started_at: startedAt,
    finished_at: finishedAt,
    status: ok ? "ok" : "error",
    trigger,
    events_count: events,
    routes_count: routes,
    stops_count: stops,
    message,
  });

  return { ok, events, routes, stops, message, lastEventId };
}
