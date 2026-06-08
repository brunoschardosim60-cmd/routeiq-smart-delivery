import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import {
  useRouteStops,
  useUpdateStopStatus,
  useStartRoute,
  useFinishRoute,
  useUpdateRouteLocation,
} from "@/lib/route-stops";
import { useAuth } from "@/hooks/use-auth";
import {
  X, Navigation, CheckCircle2, XCircle, ChevronUp, ChevronDown, MapPin, Flag, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/navegar/$routeId")({
  component: NavigatePage,
});

function NavigatePage() {
  const { routeId } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { rows } = useDbAssignedRoutes();
  const route = useMemo(() => rows.find((r) => r.id === routeId), [rows, routeId]);
  const { stops } = useRouteStops(routeId);

  const statusMut = useUpdateStopStatus(routeId);
  const startMut = useStartRoute(routeId);
  const finishMut = useFinishRoute(routeId);
  const locMut = useUpdateRouteLocation(routeId);

  const [driver, setDriver] = useState<{ lat: number; lon: number } | null>(null);
  const [expanded, setExpanded] = useState(true);
  const startedRef = useRef(false);
  const lastPushRef = useRef(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/login" });
  }, [loading, isAuthenticated, navigate]);

  // marca início da rota uma vez
  useEffect(() => {
    if (routeId && !startedRef.current) {
      startedRef.current = true;
      startMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // localização ao vivo
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Localização não disponível neste dispositivo");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setDriver({ lat, lon });
        const now = Date.now();
        if (now - lastPushRef.current > 15_000) {
          lastPushRef.current = now;
          locMut.mutate({ lat, lon });
        }
      },
      () => toast.error("Não foi possível obter sua localização. Verifique as permissões."),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapStops = stops.map((s) => ({
    id: s.id, seq: s.seq, lat: s.lat, lon: s.lon, client_name: s.client_name, address: s.address, status: s.status,
  }));
  const done = stops.filter((s) => s.status === "entregue").length;
  const next = stops.find((s) => s.status === "pendente");

  const mark = (id: string, status: "entregue" | "falha") => {
    statusMut.mutate({ id, status }, {
      onSuccess: () => toast.success(status === "entregue" ? "Entrega concluída" : "Marcada como falha"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
    });
  };

  const openExternalNav = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`, "_blank");
  };

  const finish = () => {
    finishMut.mutate(undefined, {
      onSuccess: () => {
        toast.success("Rota finalizada!");
        navigate({ to: "/motorista/rotas" });
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* topo */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/motorista/rotas/$routeId", params: { routeId } })}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-sm font-semibold truncate">Rota {route?.code ?? ""}</p>
          <p className="text-xs text-muted-foreground">{done}/{stops.length} entregas concluídas</p>
        </div>
        <div className="h-9 w-9" />
      </div>

      {/* mapa */}
      <div className="relative flex-1">
        <RouteMap stops={mapStops} driver={driver} drawRoute className="h-full w-full" />

        {/* card próxima entrega */}
        {next && (
          <div className="absolute left-3 right-3 top-3 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Próxima entrega · {next.seq}</p>
                <p className="text-sm font-semibold truncate">{next.client_name ?? "Entrega"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" /> {next.address}
                </p>
              </div>
              {next.lat != null && (
                <Button size="sm" variant="secondary" onClick={() => openExternalNav(next.lat!, next.lon!)}>
                  <Navigation className="h-4 w-4 mr-1" /> Navegar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* painel inferior de entregas */}
      <div className="border-t border-border bg-card">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
        >
          <span>Lista de entregas</span>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="max-h-[40vh] space-y-2 overflow-y-auto px-4 pb-3">
            {stops.map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      s.status === "entregue" ? "bg-success/15 text-success"
                      : s.status === "falha" ? "bg-destructive/15 text-destructive"
                      : "bg-primary/15 text-primary"
                    }`}>{s.seq}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.client_name ?? "Entrega"}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.address}</p>
                    </div>
                  </div>
                </div>
                {s.status === "pendente" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => mark(s.id, "entregue")} disabled={statusMut.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Entregue
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => mark(s.id, "falha")} disabled={statusMut.isPending}>
                      <XCircle className="h-4 w-4 mr-1" /> Falha
                    </Button>
                  </div>
                )}
                {s.status !== "pendente" && (
                  <button onClick={() => mark(s.id, "entregue")} className="mt-2 text-xs text-muted-foreground underline">
                    {s.status === "entregue" ? "✓ Entregue" : "Falha — refazer como entregue"}
                  </button>
                )}
              </div>
            ))}

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">KM da rota (calculado pelo site)</p>
              <p className="text-xl font-semibold">{route?.km ? `${route.km} km` : "—"}</p>
            </div>
            <Button onClick={finish} className="w-full" variant={done === stops.length ? "default" : "outline"} disabled={finishMut.isPending}>
              {finishMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Flag className="h-4 w-4 mr-1" />}
              Finalizar rota
            </Button>

          </div>
        )}
      </div>
    </div>
  );
}
