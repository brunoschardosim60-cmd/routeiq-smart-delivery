import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordDriverLocation } from "@/lib/driver-tracking.functions";

export type TrackerStatus =
  | "idle"
  | "requesting"
  | "denied"
  | "unavailable"
  | "tracking"
  | "error";

const MIN_DISTANCE_M = 25; // só envia se moveu pelo menos isto
const MIN_INTERVAL_MS = 15_000; // ou pelo menos a cada 15s

function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function useLocationTracker(opts: {
  assignedRouteId: string | null;
  enabled: boolean;
}) {
  const { assignedRouteId, enabled } = opts;
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lon: number; t: number } | null>(null);
  const lastRef = useRef<{ lat: number; lon: number; t: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const record = useServerFn(recordDriverLocation);

  useEffect(() => {
    if (!enabled || !assignedRouteId) {
      if (watchIdRef.current != null && typeof navigator !== "undefined") {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("requesting");
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setStatus("tracking");
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const now = Date.now();
        setCurrentPosition({ lat, lon, t: now });
        const prev = lastRef.current;
        const dist = prev ? haversineM(prev, { lat, lon }) : Infinity;
        const dt = prev ? now - prev.t : Infinity;
        if (dist < MIN_DISTANCE_M && dt < MIN_INTERVAL_MS) return;
        lastRef.current = { lat, lon, t: now };
        try {
          await record({
            data: {
              assignedRouteId,
              lat,
              lon,
              accuracy: pos.coords.accuracy ?? null,
              speed: pos.coords.speed ?? null,
              heading: pos.coords.heading ?? null,
              recordedAt: new Date(pos.timestamp).toISOString(),
            },
          });
          setLastSentAt(now);
          setLastError(null);
        } catch (err: any) {
          setLastError(err?.message ?? String(err));
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("error");
        setLastError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    watchIdRef.current = id;
    return () => {
      navigator.geolocation.clearWatch(id);
      watchIdRef.current = null;
    };
  }, [enabled, assignedRouteId, record]);

  return { status, lastError, lastSentAt, currentPosition };
}
