import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock, Gauge } from "lucide-react";
import { listActiveRoutesTracks } from "@/lib/driver-tracking.functions";
import { TrackingMap } from "@/components/TrackingMap";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/rastreamento")({
  component: RastreamentoPage,
});

function RastreamentoPage() {
  const fetchTracks = useServerFn(listActiveRoutesTracks);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["active-route-tracks"],
    queryFn: () => fetchTracks(),
    refetchInterval: 15_000,
  });
  const [selected, setSelected] = useState<string | null>(null);

  // Realtime: invalidate quando novo ponto chegar
  useEffect(() => {
    const ch = supabase
      .channel("driver_locations_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "driver_locations" },
        () => qc.invalidateQueries({ queryKey: ["active-route-tracks"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const routes = data?.routes ?? [];

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Rastreamento ao vivo</h1>
        <p className="text-sm text-muted-foreground">
          Trajeto dos veículos em rotas em andamento. Atualiza automaticamente conforme novos pontos chegam.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="max-h-[700px] overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-base">
              Rotas ativas {routes.length > 0 && <Badge variant="secondary" className="ml-2">{routes.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!isLoading && routes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma rota em andamento.</p>
            )}
            <button
              onClick={() => setSelected(null)}
              className={`w-full text-left text-xs rounded-md border px-2 py-1.5 ${
                selected === null ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              }`}
            >
              Mostrar todas
            </button>
            {routes.map((r) => {
              const last = r.points[r.points.length - 1];
              const isSel = selected === r.routeId;
              return (
                <button
                  key={r.routeId}
                  onClick={() => setSelected(isSel ? null : r.routeId)}
                  className={`w-full text-left rounded-md border p-3 text-sm transition ${
                    isSel ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{r.driverName}</span>
                    <Badge variant={r.status === "atrasado" ? "destructive" : "default"} className="shrink-0 text-[10px]">
                      {r.status === "atrasado" ? "ATRASADO" : "EM ROTA"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground font-mono">{r.code}</div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Truck className="h-3 w-3" />
                    <span className="truncate">{[r.vehicle, r.plate].filter(Boolean).join(" · ") || "—"}</span>
                  </div>
                  <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="truncate">
                      {r.origin}{r.destination ? ` → ${r.destination}` : ""}
                    </span>
                  </div>
                  {last ? (
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(last.recorded_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {last.speed != null && (
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          {Math.round(last.speed * 3.6)} km/h
                        </span>
                      )}
                      <span>· {r.points.length} pts</span>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[11px] text-amber-600">Aguardando primeiro ponto…</div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <TrackingMap routes={routes} selectedRouteId={selected} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
