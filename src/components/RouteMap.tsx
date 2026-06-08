import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/lib/use-google-maps";
import { MapPin, AlertTriangle } from "lucide-react";

export interface MapStop {
  id: string;
  seq: number;
  lat: number | null;
  lon: number | null;
  client_name: string | null;
  address: string;
  status: string;
}

interface RouteMapProps {
  stops: MapStop[];
  driver?: { lat: number; lon: number } | null;
  className?: string;
  /** desenha rota otimizada passando por todas as paradas a partir do motorista */
  drawRoute?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  entregue: "#16a34a",
  falha: "#dc2626",
  pendente: "#2563eb",
};

export function RouteMap({ stops, driver, className, drawRoute }: RouteMapProps) {
  const { ready, error } = useGoogleMaps();
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const driverMarkerRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);

  // init map
  useEffect(() => {
    if (!ready || !divRef.current || mapRef.current) return;
    const g = window.google;
    mapRef.current = new g.maps.Map(divRef.current, {
      center: { lat: -23.55, lng: -46.63 },
      zoom: 11,
      disableDefaultUI: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });
  }, [ready]);

  // markers + bounds
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = window.google;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new g.maps.LatLngBounds();
    const valid = stops.filter((s) => s.lat != null && s.lon != null);

    valid.forEach((s) => {
      const pos = { lat: s.lat as number, lng: s.lon as number };
      const marker = new g.maps.Marker({
        position: pos,
        map: mapRef.current,
        label: { text: String(s.seq), color: "#fff", fontSize: "12px", fontWeight: "600" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 13,
          fillColor: STATUS_COLOR[s.status] ?? "#2563eb",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      const info = new g.maps.InfoWindow({
        content: `<div style="font-size:13px"><b>${s.seq}. ${s.client_name ?? "Entrega"}</b><br/>${s.address}</div>`,
      });
      marker.addListener("click", () => info.open(mapRef.current, marker));
      markersRef.current.push(marker);
      bounds.extend(pos);
    });

    if (driver) bounds.extend({ lat: driver.lat, lng: driver.lon });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 64);
      if (valid.length + (driver ? 1 : 0) === 1) mapRef.current.setZoom(15);
    }
  }, [ready, stops, driver]);

  // driver marker
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = window.google;
    if (!driver) {
      driverMarkerRef.current?.setMap(null);
      driverMarkerRef.current = null;
      return;
    }
    const pos = { lat: driver.lat, lng: driver.lon };
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new g.maps.Marker({
        position: pos,
        map: mapRef.current,
        zIndex: 999,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#7c3aed",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        title: "Você",
      });
    } else {
      driverMarkerRef.current.setPosition(pos);
    }
  }, [ready, driver]);

  // directions
  useEffect(() => {
    if (!ready || !mapRef.current || !drawRoute) return;
    const g = window.google;
    const pending = stops.filter((s) => s.lat != null && s.lon != null && s.status !== "entregue");
    if (!driver || pending.length === 0) {
      rendererRef.current?.setMap(null);
      return;
    }
    const svc = new g.maps.DirectionsService();
    if (!rendererRef.current) {
      rendererRef.current = new g.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#7c3aed", strokeWeight: 5, strokeOpacity: 0.8 },
      });
      rendererRef.current.setMap(mapRef.current);
    }
    const waypoints = pending.slice(0, -1).map((s) => ({
      location: { lat: s.lat as number, lng: s.lon as number },
      stopover: true,
    }));
    const last = pending[pending.length - 1];
    svc.route(
      {
        origin: { lat: driver.lat, lng: driver.lon },
        destination: { lat: last.lat as number, lng: last.lon as number },
        waypoints,
        optimizeWaypoints: true,
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (res: any, status: string) => {
        if (status === "OK" && rendererRef.current) rendererRef.current.setDirections(res);
      },
    );
  }, [ready, stops, driver, drawRoute]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted/30 text-muted-foreground ${className ?? ""}`}>
        <AlertTriangle className="h-8 w-8 mb-2 opacity-60" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted/30 text-muted-foreground ${className ?? ""}`}>
        <MapPin className="h-8 w-8 mb-2 animate-pulse opacity-60" />
        <p className="text-sm">Carregando mapa…</p>
      </div>
    );
  }
  return <div ref={divRef} className={className} />;
}
