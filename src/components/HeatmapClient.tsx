import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { updateRouteCoords } from "@/lib/routes-db.functions";

export interface HeatPoint {
  label: string;
  count: number;
  lat?: number | null;
  lon?: number | null;
  routeIds: string[]; // rotas sem coords salvas — persistir após geocodar
}

interface Geocoded {
  label: string;
  lat: number;
  lon: number;
  count: number;
}

const CACHE_KEY = "geocode-cache-v1";

function loadCache(): Record<string, { lat: number; lon: number } | null> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(c: Record<string, { lat: number; lon: number } | null>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}

async function geocode(q: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

export function HeatmapClient({ points }: { points: HeatPoint[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [geocoded, setGeocoded] = useState<Geocoded[]>([]);
  const persistCoords = useServerFn(updateRouteCoords);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      await import("leaflet.heat");
      if (cancelled || !mapRef.current || leafletMapRef.current) return;
      const map = L.map(mapRef.current).setView([-23.55, -46.63], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      leafletMapRef.current = map;
    })();
    return () => {
      cancelled = true;
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cache = loadCache();
      const out: Geocoded[] = [];
      const needGeocode = points.filter((p) => p.lat == null || p.lon == null);
      setProgress({ done: 0, total: needGeocode.length });

      // 1) Pontos com coords já salvas no banco
      for (const p of points) {
        if (p.lat != null && p.lon != null) {
          out.push({ label: p.label, lat: p.lat, lon: p.lon, count: p.count });
        }
      }

      // 2) Geocodar pendentes
      let done = 0;
      for (const p of needGeocode) {
        if (cancelled) return;
        const key = p.label.trim().toLowerCase();
        let hit = cache[key];
        if (hit === undefined) {
          hit = await geocode(p.label);
          cache[key] = hit;
          saveCache(cache);
          await new Promise((r) => setTimeout(r, 1100));
        }
        if (hit) {
          out.push({ label: p.label, lat: hit.lat, lon: hit.lon, count: p.count });
          // Persistir nos rotas
          for (const id of p.routeIds) {
            try { await persistCoords({ data: { id, lat: hit.lat, lon: hit.lon } }); } catch {}
          }
        }
        done++;
        if (!cancelled) {
          setProgress({ done, total: needGeocode.length });
          setGeocoded([...out]);
        }
      }
      if (!cancelled) setGeocoded(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [points, persistCoords]);

  useEffect(() => {
    (async () => {
      const map = leafletMapRef.current;
      if (!map || geocoded.length === 0) return;
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
      const heatPoints = geocoded.map((g) => [g.lat, g.lon, g.count]);
      // @ts-ignore
      heatLayerRef.current = L.heatLayer(heatPoints, { radius: 30, blur: 20, maxZoom: 12 }).addTo(map);
      const bounds = L.latLngBounds(geocoded.map((g) => [g.lat, g.lon] as [number, number]));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
    })();
  }, [geocoded]);

  return (
    <div className="space-y-2">
      <div ref={mapRef} className="h-[500px] w-full rounded-lg border border-border bg-muted" />
      {progress.total > 0 && progress.done < progress.total && (
        <p className="text-xs text-muted-foreground">
          Geocodificando endereços novos… {progress.done}/{progress.total}
        </p>
      )}
      {progress.total === 0 && geocoded.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {geocoded.length} pontos carregados (coordenadas salvas no banco).
        </p>
      )}
      {progress.total > 0 && progress.done === progress.total && (
        <p className="text-xs text-muted-foreground">
          {geocoded.length} endereços plotados. Coordenadas salvas para próximas consultas.
        </p>
      )}
    </div>
  );
}
