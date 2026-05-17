import { useEffect, useRef } from "react";
import type { ActiveRouteTrack } from "@/lib/driver-tracking.functions";
import { getOsrmRoute } from "@/lib/osrm";

const COLORS = [
  "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#65a30d", "#ea580c", "#4f46e5",
];

export function TrackingMap({
  routes,
  selectedRouteId,
}: {
  routes: ActiveRouteTrack[];
  selectedRouteId: string | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
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
      const map = leafletMapRef.current;
      if (!map) return;
      const L = (await import("leaflet")).default;

      // Clear previous layers
      for (const l of layersRef.current) map.removeLayer(l);
      layersRef.current = [];

      const visible = selectedRouteId
        ? routes.filter((r) => r.routeId === selectedRouteId)
        : routes;

      const allLatLngs: [number, number][] = [];

      // Planejado: busca em paralelo (cacheado por origin/destination)
      const plannedPromises = visible.map(async (r) => {
        if (r.originLat == null || r.originLon == null || r.destinationLat == null || r.destinationLon == null) {
          return null;
        }
        try {
          const route = await getOsrmRoute(
            { lat: r.originLat, lon: r.originLon },
            { lat: r.destinationLat, lon: r.destinationLon },
            { withGeometry: true },
          );
          return route.geometry;
        } catch {
          return null;
        }
      });
      const plannedGeoms = await Promise.all(plannedPromises);
      if (cancelled) return;

      visible.forEach((r, idx) => {
        const color = COLORS[idx % COLORS.length];

        // 1) Rota planejada (tracejada, atrás)
        const planned = plannedGeoms[idx];
        if (planned && planned.length > 1) {
          const plannedLine = L.polyline(planned, {
            color,
            weight: 3,
            opacity: 0.5,
            dashArray: "8 8",
          })
            .bindTooltip(`Planejada · ${r.code}`, { sticky: true })
            .addTo(map);
          layersRef.current.push(plannedLine);
          allLatLngs.push(...planned);

          // Marcador origem / destino planejados
          const oMarker = L.circleMarker([r.originLat!, r.originLon!], {
            radius: 6, color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.6,
          }).bindTooltip("Origem (planejada)", { direction: "top" }).addTo(map);
          const dMarker = L.circleMarker([r.destinationLat!, r.destinationLon!], {
            radius: 8, color, weight: 3, fillColor: "#fff", fillOpacity: 1,
          }).bindTooltip(`Destino · ${r.destination ?? ""}`, { direction: "top" }).addTo(map);
          layersRef.current.push(oMarker, dMarker);
        }

        if (r.points.length === 0) return;
        const latlngs = r.points.map((p) => [p.lat, p.lon]) as [number, number][];
        allLatLngs.push(...latlngs);

        // 2) Trajeto real (linha cheia, por cima)
        const line = L.polyline(latlngs, {
          color,
          weight: 4,
          opacity: 0.9,
        })
          .bindTooltip(`Real · ${r.code} · ${r.points.length} pontos`, { sticky: true })
          .addTo(map);
        layersRef.current.push(line);

        // Start marker (primeiro ping real)
        const start = latlngs[0];
        const startMarker = L.circleMarker(start, {
          radius: 7,
          color: "#fff",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        })
          .bindTooltip(`Início real · ${r.code}`, { permanent: false })
          .addTo(map);
        layersRef.current.push(startMarker);

        // Current position marker
        const last = latlngs[latlngs.length - 1];
        const lastPoint = r.points[r.points.length - 1];
        const veh = [r.vehicle, r.plate].filter(Boolean).join(" · ") || "Veículo —";
        const speedKmh = lastPoint.speed != null ? `${Math.round(lastPoint.speed * 3.6)} km/h` : "";
        const popup = `
          <div style="min-width:200px">
            <div style="font-weight:600">${r.driverName}</div>
            <div style="font-size:12px;color:#666">${r.code}</div>
            <div style="font-size:12px;margin-top:4px">${veh}</div>
            <div style="font-size:11px;color:#666;margin-top:4px">
              ${r.origin}${r.destination ? " → " + r.destination : ""}
            </div>
            <div style="font-size:11px;color:#888;margin-top:4px">
              Último ping: ${new Date(lastPoint.recorded_at).toLocaleTimeString("pt-BR")}
              ${speedKmh ? " · " + speedKmh : ""}
            </div>
            <div style="font-size:11px;color:#888;margin-top:2px">
              Pontos: ${r.points.length}
            </div>
          </div>
        `;
        const liveMarker = L.circleMarker(last, {
          radius: 10,
          color: color,
          weight: 3,
          fillColor: "#fff",
          fillOpacity: 1,
        })
          .bindPopup(popup)
          .bindTooltip(r.driverName, { permanent: true, direction: "top", offset: [0, -10] })
          .addTo(map);
        layersRef.current.push(liveMarker);
      });

      if (allLatLngs.length > 0) {
        const bounds = L.latLngBounds(allLatLngs);
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    })();
    return () => { cancelled = true; };
  }, [routes, selectedRouteId]);

  return (
    <div className="space-y-2">
      <div ref={mapRef} className="h-[600px] w-full rounded-lg border border-border bg-muted" />
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-foreground/70" /> Trajeto real (GPS)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-foreground/60" /> Rota planejada (OSRM)
        </span>
      </div>
    </div>
  );
}
