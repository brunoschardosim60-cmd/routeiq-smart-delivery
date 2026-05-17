import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotifType = "atraso" | "problema" | "combustivel" | "rota" | "financeiro" | "sistema";
export type NotifAudience = "admin" | "motorista";

export interface NotifItem {
  id: string;
  audience: NotifAudience;
  type: NotifType;
  title: string;
  desc: string;
  time: string; // ISO
  link?: { to: string; params?: Record<string, string> };
}

function rel(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
  return `${Math.floor(diff / 86400)} d atrás`;
}

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const items: NotifItem[] = [];

    // Detect role
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "owner" || r.role === "admin");
    const audience: NotifAudience = isAdmin ? "admin" : "motorista";

    const since = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();

    // Rotas
    let routesQ = supabase.from("assigned_routes")
      .select("id, code, driver_name, status, updated_at, date_iso")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (!isAdmin) routesQ = routesQ.eq("driver_id", userId);
    const { data: routes } = await routesQ;

    (routes ?? []).forEach((r: any) => {
      if (r.status === "atrasado") {
        items.push({
          id: `route-late-${r.id}`,
          audience,
          type: "atraso",
          title: `Rota ${r.code} atrasada`,
          desc: `${r.driver_name} • ${r.date_iso}`,
          time: r.updated_at,
          link: { to: "/admin/rotas/$routeId", params: { routeId: r.id } },
        });
      } else if (r.status === "concluido") {
        items.push({
          id: `route-done-${r.id}`,
          audience,
          type: "rota",
          title: `Rota ${r.code} concluída`,
          desc: `${r.driver_name} finalizou a rota`,
          time: r.updated_at,
          link: isAdmin ? { to: "/admin/rotas/$routeId", params: { routeId: r.id } } : undefined,
        });
      } else if (r.status === "em_andamento" && isAdmin) {
        items.push({
          id: `route-start-${r.id}`,
          audience,
          type: "rota",
          title: `Rota ${r.code} em andamento`,
          desc: `${r.driver_name} iniciou a rota`,
          time: r.updated_at,
          link: { to: "/admin/rastreamento" },
        });
      }
    });

    // Sync errors (admin only)
    if (isAdmin) {
      const { data: syncs } = await supabase
        .from("comprovei_sync_log")
        .select("id, status, message, started_at")
        .eq("status", "error")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(10);
      (syncs ?? []).forEach((s: any) => {
        items.push({
          id: `sync-err-${s.id}`,
          audience,
          type: "problema",
          title: "Falha na sincronização Comprovei",
          desc: s.message ?? "Erro desconhecido",
          time: s.started_at,
          link: { to: "/admin/sync-logs" },
        });
      });
    }

    // Combustível baixo km/L
    let fuelQ = supabase.from("fuel_entries")
      .select("id, driver_name, liters, total, odometer, date_iso, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!isAdmin) fuelQ = fuelQ.eq("driver_id", userId);
    const { data: fuels } = await fuelQ;
    (fuels ?? []).forEach((f: any) => {
      items.push({
        id: `fuel-${f.id}`,
        audience,
        type: "combustivel",
        title: "Abastecimento registrado",
        desc: `${f.driver_name} • ${Number(f.liters).toFixed(1)}L • R$ ${Number(f.total).toFixed(2)}`,
        time: f.created_at,
        link: { to: isAdmin ? "/admin/combustivel" : "/motorista/combustivel" },
      });
    });

    items.sort((a, b) => +new Date(b.time) - +new Date(a.time));
    return {
      audience,
      items: items.slice(0, 30).map((i) => ({ ...i, timeLabel: rel(i.time) })),
    };
  });
