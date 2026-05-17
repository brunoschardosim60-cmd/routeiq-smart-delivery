import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { HeatmapClient } from "@/components/HeatmapClient";
import { todayISO } from "@/lib/format";

export const Route = createFileRoute("/admin/heatmap")({
  component: HeatmapPage,
});

function HeatmapPage() {
  const { raw, isLoading } = useDbAssignedRoutes();
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const points = useMemo(() => {
    const map = new Map<string, { label: string; count: number; lat?: number | null; lon?: number | null; routeIds: string[] }>();
    for (const r of raw) {
      const d = r.date_iso;
      if (d < from || d > to) continue;
      const dest = (r.destination ?? "").trim();
      if (!dest) continue;
      const key = dest.toLowerCase();
      const lat = (r as any).destination_lat ?? null;
      const lon = (r as any).destination_lon ?? null;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (existing.lat == null && lat != null) { existing.lat = lat; existing.lon = lon; }
        if (lat == null) existing.routeIds.push(r.id);
      } else {
        map.set(key, {
          label: dest,
          count: 1,
          lat,
          lon,
          routeIds: lat == null ? [r.id] : [],
        });
      }
    }
    return Array.from(map.values());
  }, [raw, from, to]);

  const totalRoutes = points.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Heatmap de Entregas</h1>
        <p className="text-sm text-muted-foreground">
          Concentração de destinos por período. Endereços são geocodificados via OpenStreetMap (gratuito, sem chave).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div>
            <Label htmlFor="from">De</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">Até</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="ml-auto self-end text-sm text-muted-foreground">
            {totalRoutes} rotas / {points.length} destinos únicos
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : points.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum destino encontrado no período.</p>
          ) : (
            <HeatmapClient points={points} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
