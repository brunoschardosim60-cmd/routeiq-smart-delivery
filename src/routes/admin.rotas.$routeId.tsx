import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { RouteMap } from "@/components/RouteMap";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useRouteStops } from "@/lib/route-stops";
import { ArrowLeft, MapPin, PackageCheck } from "lucide-react";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/rotas/$routeId")({
  component: RouteDetail,
});

function RouteDetail() {
  const { routeId } = Route.useParams();
  const { rows } = useDbAssignedRoutes();
  const r = useMemo(() => rows.find((x) => x.id === routeId), [rows, routeId]);
  const { stops } = useRouteStops(routeId);

  const mapStops = stops.map((s) => ({
    id: s.id, seq: s.seq, lat: s.lat, lon: s.lon, client_name: s.client_name, address: s.address, status: s.status,
  }));
  const done = stops.filter((s) => s.status === "entregue").length;
  const margin = (r?.revenue ?? 0) - (r?.cost ?? 0);

  return (
    <div className="space-y-6">
      <Link to="/admin/rotas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rota {r?.code ?? ""}</h1>
          <p className="text-sm text-muted-foreground">{r?.driverName} · {r?.date}</p>
        </div>
        {r && <StatusBadge status={r.status} />}
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden rounded-xl">
          <RouteMap stops={mapStops} className="h-72 w-full" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-xl font-semibold mt-1">{brl(r?.revenue ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Custo estimado</p><p className="text-xl font-semibold mt-1">{brl(r?.cost ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Margem</p><p className="text-xl font-semibold mt-1 text-success">{brl(margin)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Entregas</p><p className="text-xl font-semibold mt-1">{done}/{stops.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Locais de entrega</CardTitle></CardHeader>
        <CardContent>
          {stops.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma entrega cadastrada para esta rota.</p>
          ) : (
            <div className="relative space-y-4 pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
              {stops.map((s) => (
                <div key={s.id} className="relative">
                  <div className={`absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2 border-background ${
                    s.status === "entregue" ? "bg-success" : s.status === "falha" ? "bg-destructive" : "bg-muted-foreground"
                  }`} />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{s.seq}. {s.client_name ?? "Entrega"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.address}</p>
                      {s.note && <p className="text-xs text-warning mt-1">⚠ {s.note}</p>}
                    </div>
                    <div className="text-right">
                      {s.status === "entregue" && <span className="text-xs text-success inline-flex items-center gap-1"><PackageCheck className="h-3 w-3" /> Entregue</span>}
                      {s.completed_at && <p className="text-xs text-muted-foreground mt-0.5">{new Date(s.completed_at).toLocaleString("pt-BR")}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
