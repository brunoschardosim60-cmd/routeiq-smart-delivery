import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { routesData, sampleStops } from "@/lib/mock-data";
import { ArrowLeft, MapPin } from "lucide-react";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/rotas/$routeId")({
  component: RouteDetail,
});

function RouteDetail() {
  const { routeId } = Route.useParams();
  const r = routesData.find((x) => x.id === routeId) ?? routesData[0];
  const margin = r.revenue - r.cost;

  return (
    <div className="space-y-6">
      <Link to="/admin/rotas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rota {r.code}</h1>
          <p className="text-sm text-muted-foreground">{r.driverName} · {r.date}</p>
        </div>
        <StatusBadge status={r.status} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex h-72 flex-col items-center justify-center bg-muted/30 text-muted-foreground">
            <MapPin className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">Mapa — Google Maps API</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-xl font-semibold mt-1">{brl(r.revenue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Custo combustível</p><p className="text-xl font-semibold mt-1">{brl(r.cost * 0.45)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Custo estimado</p><p className="text-xl font-semibold mt-1">{brl(r.cost)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Margem</p><p className="text-xl font-semibold mt-1 text-success">{brl(margin)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Timeline de entregas</CardTitle></CardHeader>
        <CardContent>
          <div className="relative space-y-4 pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
            {sampleStops.map((s) => (
              <div key={s.seq} className="relative">
                <div className={`absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2 border-background ${
                  s.status === "entregue" ? "bg-success" : s.status === "tentativa" ? "bg-warning" : "bg-muted-foreground"
                }`} />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{s.seq}. {s.client}</p>
                    <p className="text-xs text-muted-foreground">{s.address}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tipo: {s.productType}</p>
                    {s.note && <p className="text-xs text-warning mt-1">⚠ {s.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Previsto {s.scheduled}{s.done && ` · Realizado ${s.done}`}</p>
                    <div className="mt-1"><StatusBadge status={s.status} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
