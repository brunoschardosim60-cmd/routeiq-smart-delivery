// Sincronização Comprovei POR MOTORISTA.
// Cada motorista tem suas próprias credenciais (criptografadas no banco).
// O job de sync itera por todas as credenciais ativas e busca eventos.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function basicAuth(user: string, pwd: string) {
  return "Basic " + btoa(`${user}:${pwd}`);
}

interface DriverCred {
  driver_id: string;
  comprovei_user: string;
  password: string;
  last_event_id: string | null;
}

async function loadConfigUrls() {
  const { data } = await supabaseAdmin
    .from("comprovei_config")
    .select("base_events_url, base_api_url")
    .limit(1)
    .single();
  return {
    eventsUrl: data?.base_events_url ?? "https://events-api.comprovei.com",
    apiUrl: data?.base_api_url ?? "https://api.comprovei.com.br",
  };
}

interface DriverSyncResult {
  driverId: string;
  ok: boolean;
  events: number;
  routes: number;
  stops: number;
  message: string;
  lastEventId: string | null;
}

export async function syncDriverComprovei(cred: DriverCred): Promise<DriverSyncResult> {
  const { eventsUrl, apiUrl } = await loadConfigUrls();
  const auth = basicAuth(cred.comprovei_user, cred.password);
  let events = 0, routes = 0, stops = 0;
  let lastEventId: string | null = cred.last_event_id;
  let message = "";
  let ok = true;

  try {
    // WS205 — Events
    const url = `${eventsUrl}/events?qtd=100${cred.last_event_id ? `&eventId=${encodeURIComponent(cred.last_event_id)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
    if (!res.ok) throw new Error(`WS205 falhou (${res.status})`);
    const json = (await res.json()) as { events?: Array<Record<string, unknown>> };
    for (const e of json.events ?? []) {
      const id = String(e.id ?? e.eventId ?? "");
      if (!id) continue;
      await supabaseAdmin.from("comprovei_events").upsert({
        id,
        driver_id: cred.driver_id,
        event_type: String(e.type ?? "unknown"),
        occurred_at: (e.occurredAt as string) ?? null,
        route_external_id: (e.routeId as string) ?? null,
        stop_external_id: (e.stopId as string) ?? null,
        payload: e as never,
      });
      lastEventId = id;
      events++;
    }

    // WS601 — Routes (best-effort)
    try {
      const r = await fetch(`${apiUrl}/api/1.1/util/export/route`, {
        method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: "{}",
      });
      if (r.ok) {
        const j = (await r.json()) as { routes?: Array<Record<string, unknown>> };
        for (const rt of j.routes ?? []) {
          const externalId = String(rt.id ?? rt.routeId ?? "");
          if (!externalId) continue;
          await supabaseAdmin.from("comprovei_routes").upsert({
            external_id: externalId,
            driver_id: cred.driver_id,
            driver_name: rt.driver as string,
            vehicle: rt.vehicle as string,
            plate: rt.plate as string,
            origin: rt.origin as string,
            destination: rt.destination as string,
            status: rt.status as string,
            distance_estimated_km: (rt.distanceEstimated as number) ?? null,
            distance_traveled_km: (rt.distanceTraveled as number) ?? null,
            delivery_count: (rt.deliveryCount as number) ?? null,
            planned_start: (rt.plannedStart as string) ?? null,
            planned_end: (rt.plannedEnd as string) ?? null,
            in_transit_at: (rt.inTransitAt as string) ?? null,
            arrived_base_at: (rt.arrivedBaseAt as string) ?? null,
            raw: rt as never,
            updated_at: new Date().toISOString(),
          });
          routes++;
        }
      }
    } catch {/* ignora falha de WS601 */}

    message = `Sync OK — ${events} eventos, ${routes} rotas, ${stops} paradas.`;
  } catch (e) {
    ok = false;
    message = e instanceof Error ? e.message : "Falha desconhecida";
  }

  // Atualiza estado da credencial
  const updates: Record<string, unknown> = {
    last_sync_at: new Date().toISOString(),
    last_status: ok ? "ok" : "error",
    last_message: message,
  };
  if (lastEventId) updates.last_event_id = lastEventId;
  // Acumula contadores
  const { data: prev } = await supabaseAdmin
    .from("driver_comprovei_credentials")
    .select("events_synced, routes_synced, stops_synced")
    .eq("driver_id", cred.driver_id)
    .single();
  if (prev) {
    updates.events_synced = (prev.events_synced ?? 0) + events;
    updates.routes_synced = (prev.routes_synced ?? 0) + routes;
    updates.stops_synced = (prev.stops_synced ?? 0) + stops;
  }
  await supabaseAdmin.from("driver_comprovei_credentials").update(updates as never).eq("driver_id", cred.driver_id);

  return { driverId: cred.driver_id, ok, events, routes, stops, message, lastEventId };
}

// Sync de UM motorista específico
export async function runDriverComproveiSync(driverId: string, trigger: "manual" | "auto") {
  const startedAt = new Date().toISOString();
  const key = process.env.COMPROVEI_ENCRYPTION_KEY;
  if (!key) throw new Error("COMPROVEI_ENCRYPTION_KEY não configurada");

  const { data: rows, error } = await supabaseAdmin.rpc(
    "get_driver_comprovei_credentials_decrypted",
    { p_driver_id: driverId, p_key: key },
  );
  if (error) throw new Error(error.message);
  const cred = (rows as DriverCred[] | null)?.[0];
  if (!cred) throw new Error("Credenciais não encontradas para este motorista");
  if (!cred) return null;

  const result = await syncDriverComprovei(cred);

  await supabaseAdmin.from("comprovei_sync_log").insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: result.ok ? "ok" : "error",
    trigger,
    events_count: result.events,
    routes_count: result.routes,
    stops_count: result.stops,
    message: `[${driverId}] ${result.message}`,
  });

  return result;
}

// Sync de TODOS motoristas com sync_active=true (chamado pelo cron)
export async function runAllDriversComproveiSync(trigger: "manual" | "auto") {
  const startedAt = new Date().toISOString();
  const key = process.env.COMPROVEI_ENCRYPTION_KEY;
  if (!key) throw new Error("COMPROVEI_ENCRYPTION_KEY não configurada");

  const { data: rows, error } = await supabaseAdmin.rpc(
    "list_active_driver_comprovei_credentials_decrypted",
    { p_key: key },
  );
  if (error) throw new Error(error.message);

  const creds = (rows as DriverCred[] | null) ?? [];
  const results: DriverSyncResult[] = [];
  for (const c of creds) {
    try {
      results.push(await syncDriverComprovei({ ...c, last_event_id: c.last_event_id ?? null }));
    } catch (e) {
      results.push({
        driverId: c.driver_id, ok: false, events: 0, routes: 0, stops: 0,
        message: e instanceof Error ? e.message : "erro", lastEventId: null,
      });
    }
  }

  const totals = results.reduce(
    (a, r) => ({ events: a.events + r.events, routes: a.routes + r.routes, stops: a.stops + r.stops }),
    { events: 0, routes: 0, stops: 0 },
  );
  const failed = results.filter((r) => !r.ok).length;

  await supabaseAdmin.from("comprovei_sync_log").insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: failed === 0 ? "ok" : (failed === results.length ? "error" : "partial"),
    trigger,
    events_count: totals.events,
    routes_count: totals.routes,
    stops_count: totals.stops,
    message: `${results.length} motoristas processados (${failed} falhas)`,
  });

  // Atualiza state global agregado
  const { data: state } = await supabaseAdmin.from("comprovei_sync_state").select("id, events_synced, routes_synced, stops_synced").limit(1).single();
  if (state) {
    await supabaseAdmin.from("comprovei_sync_state").update({
      last_sync_at: new Date().toISOString(),
      last_status: failed === 0 ? "ok" : "error",
      last_message: `${results.length} motoristas, ${totals.events} eventos`,
      events_synced: (state.events_synced ?? 0) + totals.events,
      routes_synced: (state.routes_synced ?? 0) + totals.routes,
      stops_synced: (state.stops_synced ?? 0) + totals.stops,
      updated_at: new Date().toISOString(),
    }).eq("id", state.id);
  }

  return { drivers: results.length, failed, totals, results };
}

// Testa conexão com credenciais ainda não salvas (form Connect)
export async function testComproveiCredentials(user: string, password: string) {
  const { eventsUrl } = await loadConfigUrls();
  try {
    const res = await fetch(`${eventsUrl}/events?qtd=1`, {
      headers: { Authorization: basicAuth(user, password), Accept: "application/json" },
    });
    return {
      ok: res.ok,
      status: res.status,
      message: res.ok ? "Conexão válida ✅" : `Falha (${res.status}) ${res.statusText}`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro de rede" };
  }
}
