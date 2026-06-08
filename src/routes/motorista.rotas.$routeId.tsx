import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { RouteMap } from "@/components/RouteMap";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useRouteStops, useAddRouteStops, useDeleteRouteStop } from "@/lib/route-stops";
import { ArrowLeft, Plus, Trash2, Navigation, MapPin, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/motorista/rotas/$routeId")({
  component: RouteDetail,
});

function RouteDetail() {
  const { routeId } = Route.useParams();
  const navigate = useNavigate();
  const { rows } = useDbAssignedRoutes();
  const route = useMemo(() => rows.find((r) => r.id === routeId), [rows, routeId]);
  const { stops, isLoading } = useRouteStops(routeId);
  const addMut = useAddRouteStops(routeId);
  const delMut = useDeleteRouteStop(routeId);

  const [client, setClient] = useState("");
  const [address, setAddress] = useState("");

  const addStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return toast.error("Informe o endereço da entrega");
    try {
      const r = await addMut.mutateAsync([{ clientName: client || null, address }]);
      if (r.ok) {
        toast.success("Entrega adicionada");
        setClient("");
        setAddress("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    }
  };

  const mapStops = stops.map((s) => ({
    id: s.id,
    seq: s.seq,
    lat: s.lat,
    lon: s.lon,
    client_name: s.client_name,
    address: s.address,
    status: s.status,
  }));
  const done = stops.filter((s) => s.status === "entregue").length;

  return (
    <div className="space-y-6">
      <Link to="/motorista/rotas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rota {route?.code ?? ""}</h1>
          <p className="text-sm text-muted-foreground">{route?.origin} · {route?.date}</p>
        </div>
        <div className="flex items-center gap-2">
          {route && <StatusBadge status={route.status} />}
          <Button
            onClick={() => navigate({ to: "/navegar/$routeId", params: { routeId } })}
            disabled={stops.length === 0}
          >
            <Navigation className="h-4 w-4 mr-2" /> Iniciar rota
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden rounded-xl">
          <RouteMap stops={mapStops} className="h-72 w-full" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Entregas</p><p className="text-xl font-semibold">{stops.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Concluídas</p><p className="text-xl font-semibold text-success">{done}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-xl font-semibold">{stops.length - done}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Adicionar local de entrega</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addStop} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <Input placeholder="Cliente (opcional)" value={client} onChange={(e) => setClient(e.target.value)} />
            <Input placeholder="Endereço completo, cidade" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Button type="submit" disabled={addMut.isPending}>
              {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Adicionar</>}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">O endereço é localizado automaticamente no mapa.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Locais de entrega ({stops.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Carregando…</p>
          ) : stops.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma entrega cadastrada. Adicione endereços acima.</p>
          ) : (
            stops.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{s.seq}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.client_name ?? "Entrega"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" /> {s.address}
                    </p>
                    {s.status === "entregue" && <span className="text-xs text-success inline-flex items-center gap-1 mt-1"><PackageCheck className="h-3 w-3" /> Entregue</span>}
                    {s.status === "falha" && <span className="text-xs text-destructive mt-1">Falha na entrega</span>}
                    {s.lat == null && <span className="text-xs text-warning mt-1 block">⚠ Endereço não localizado no mapa</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => delMut.mutate(s.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
