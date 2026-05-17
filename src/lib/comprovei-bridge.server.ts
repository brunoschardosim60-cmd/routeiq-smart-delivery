// Bridge Comprovei → assigned_routes
// Sincroniza rotas e eventos do Comprovei para o sistema interno:
// - Cria assigned_routes quando uma rota do Comprovei aparece como "em trânsito"
// - Atualiza `done` conforme stops são entregues
// - Finaliza (status=concluido) quando a rota chega na base (route.arrived_base / arrived_base_at)
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface BridgeStats {
  created: number;
  updated: number;
  finished: number;
}

function toUuidOrNull(s: string | null | undefined): string | null {
  if (!s) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

function isInTransit(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes("transit") || s.includes("andamento") || s === "in_progress" || s === "started";
}

function isArrived(status: string | null | undefined, arrivedAt: string | null | undefined): boolean {
  if (arrivedAt) return true;
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes("arrived") || s.includes("finalizad") || s.includes("conclu") || s === "completed" || s === "done";
}

async function nextRouteCode(companyId: string): Promise<string> {
  const { count } = await supabaseAdmin
    .from("assigned_routes")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  const seq = (count ?? 0) + 1;
  return `RT-A${String(2500 + seq).padStart(4, "0")}`;
}

/**
 * Reconcilia rotas do Comprovei de um motorista específico com assigned_routes.
 * Chamada após cada sync por motorista.
 */
export async function bridgeDriverComproveiRoutes(driverIdText: string): Promise<BridgeStats> {
  const stats: BridgeStats = { created: 0, updated: 0, finished: 0 };

  const driverUuid = toUuidOrNull(driverIdText);
  if (!driverUuid) return stats;

  // Descobre company_id do motorista
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("company_id, full_name")
    .eq("id", driverUuid)
    .maybeSingle();
  const companyId = prof?.company_id;
  if (!companyId) return stats;
  const driverName = prof?.full_name ?? "Motorista";

  // Pega as rotas do Comprovei desse motorista (últimas 50 atualizadas)
  const { data: cmpRoutes } = await supabaseAdmin
    .from("comprovei_routes")
    .select("external_id, status, origin, destination, distance_estimated_km, distance_traveled_km, delivery_count, planned_start, planned_end, in_transit_at, arrived_base_at, updated_at")
    .eq("driver_id", driverIdText)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (!cmpRoutes || cmpRoutes.length === 0) return stats;

  for (const r of cmpRoutes) {
    const externalId = r.external_id;
    if (!externalId) continue;

    // Já existe um assigned_route vinculado?
    const { data: existing } = await supabaseAdmin
      .from("assigned_routes")
      .select("id, status, done, total_deliveries, km")
      .eq("company_id", companyId)
      .eq("comprovei_external_id", externalId)
      .maybeSingle();

    // Conta stops entregues para esta rota
    const { count: doneStops } = await supabaseAdmin
      .from("comprovei_stops")
      .select("external_id", { count: "exact", head: true })
      .eq("route_external_id", externalId)
      .or("status.ilike.%delivered%,status.ilike.%conclu%,status.ilike.%entregue%,done_at.not.is.null");

    const totalDeliveries = r.delivery_count ?? 0;
    const arrived = isArrived(r.status, r.arrived_base_at);
    const inTransit = isInTransit(r.status) || (!!r.in_transit_at && !arrived);

    if (!existing) {
      // Criar somente se em trânsito ou já chegou (importa histórico recente)
      if (!inTransit && !arrived) continue;

      const dateISO = (r.in_transit_at ?? r.planned_start ?? r.updated_at ?? new Date().toISOString()).slice(0, 10);
      const code = await nextRouteCode(companyId);
      const km = Number(r.distance_traveled_km ?? r.distance_estimated_km ?? 0);
      const status = arrived ? "concluido" : "em_andamento";
      const done = arrived ? totalDeliveries : (doneStops ?? 0);

      const { error: insErr } = await supabaseAdmin.from("assigned_routes").insert({
        company_id: companyId,
        driver_id: driverUuid,
        driver_name: driverName,
        code,
        date_iso: dateISO,
        departure: r.planned_start ? new Date(r.planned_start).toISOString().slice(11, 16) : null,
        expected_return: r.planned_end ? new Date(r.planned_end).toISOString().slice(11, 16) : null,
        origin: r.origin ?? "Base",
        destination: r.destination ?? null,
        total_deliveries: totalDeliveries,
        done,
        km,
        status,
        trip_type: "diaria",
        comprovei_external_id: externalId,
        notes: `Importado do Comprovei (${externalId})`,
      } as never);
      if (!insErr) {
        stats.created++;
        if (arrived) stats.finished++;
      }
      continue;
    }

    // Já existe: atualizar done e finalizar se preciso
    const patch: Record<string, unknown> = {};
    const newDone = arrived ? totalDeliveries : Math.max(existing.done ?? 0, doneStops ?? 0);
    if (newDone !== existing.done) patch.done = newDone;

    if (arrived && existing.status !== "concluido") {
      patch.status = "concluido";
      patch.done = totalDeliveries;
      const km = Number(r.distance_traveled_km ?? r.distance_estimated_km ?? existing.km ?? 0);
      if (km > 0) patch.km = km;
      stats.finished++;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin
        .from("assigned_routes")
        .update(patch as never)
        .eq("id", existing.id);
      if (!error) stats.updated++;
    }
  }

  return stats;
}
