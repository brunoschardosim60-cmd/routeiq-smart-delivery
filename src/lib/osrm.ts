// OSRM client com cache em localStorage + memória.
// Reduz chamadas externas (especialmente durante rastreamento ao vivo).

export interface LatLon { lat: number; lon: number }

export interface OsrmRoute {
  km: number;          // distância em km
  durationMin: number; // tempo estimado em minutos
  geometry: [number, number][] | null; // [lat, lon][] decoded polyline (overview=full)
}

const CACHE_KEY = "osrm-route-cache-v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface Entry { value: OsrmRoute; t: number }

const memCache = new Map<string, Entry>();
let diskLoaded = false;

function loadDisk() {
  if (diskLoaded || typeof window === "undefined") return;
  diskLoaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, Entry>;
    const now = Date.now();
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v.t === "number" && now - v.t < TTL_MS) memCache.set(k, v);
    }
  } catch {}
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, Entry> = {};
    for (const [k, v] of memCache) obj[k] = v;
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

// Arredonda para ~10 metros (4 casas decimais) para chave estável.
function round(n: number) { return Math.round(n * 1e4) / 1e4; }

function key(a: LatLon, b: LatLon, withGeom: boolean) {
  return `${round(a.lat)},${round(a.lon)}|${round(b.lat)},${round(b.lon)}|${withGeom ? "g" : "d"}`;
}

// Decodifica polyline5 do OSRM
function decodePolyline(str: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lon = 0;
  while (index < str.length) {
    let b: number, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat * 1e-5, lon * 1e-5]);
  }
  return coords;
}

function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return +(2 * R * Math.asin(Math.sqrt(s))).toFixed(2);
}

/**
 * Busca rota via OSRM público, com cache.
 * withGeometry=true retorna pontos para desenhar a polyline.
 */
export async function getOsrmRoute(
  origin: LatLon,
  destination: LatLon,
  opts: { withGeometry?: boolean } = {},
): Promise<OsrmRoute> {
  loadDisk();
  const k = key(origin, destination, !!opts.withGeometry);
  const cached = memCache.get(k);
  if (cached) return cached.value;

  const overview = opts.withGeometry ? "full" : "false";
  const url =
    `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
    `?overview=${overview}&geometries=polyline`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (route && typeof route.distance === "number") {
      const value: OsrmRoute = {
        km: +(route.distance / 1000).toFixed(2),
        durationMin: +(route.duration / 60).toFixed(0),
        geometry: opts.withGeometry && route.geometry ? decodePolyline(route.geometry) : null,
      };
      memCache.set(k, { value, t: Date.now() });
      persist();
      return value;
    }
  } catch {}

  // Fallback: haversine
  const fallback: OsrmRoute = {
    km: haversineKm(origin, destination),
    durationMin: 0,
    geometry: null,
  };
  return fallback;
}

/** Apenas distância (não cacheia geometria) — atalho ergonômico. */
export async function getOsrmKm(origin: LatLon, destination: LatLon): Promise<number> {
  const r = await getOsrmRoute(origin, destination);
  return r.km;
}
