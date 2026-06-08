import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://maps.googleapis.com/maps/api/geocode/json";

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("Chave do Google Maps ausente no servidor");
  return k;
}

/** Reverse geocode: coordenadas -> endereço formatado */
export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ lat: z.number(), lon: z.number() }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const url = `${BASE}?latlng=${data.lat},${data.lon}&language=pt-BR&region=br&key=${key()}`;
      const res = await fetch(url);
      const json = (await res.json()) as any;
      const r = json?.results?.[0];
      if (!r) return { ok: false as const };
      return {
        ok: true as const,
        address: r.formatted_address as string,
        lat: r.geometry.location.lat as number,
        lon: r.geometry.location.lng as number,
      };
    } catch {
      return { ok: false as const };
    }
  });

export interface AddressSuggestion {
  address: string;
  lat: number;
  lon: number;
}

/** Sugestões de endereço (autocomplete leve via Geocoding API) */
export const suggestAddresses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(3).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const url = `${BASE}?address=${encodeURIComponent(
        data.query,
      )}&language=pt-BR&region=br&key=${key()}`;
      const res = await fetch(url);
      const json = (await res.json()) as any;
      const results = (json?.results ?? []) as any[];
      const suggestions: AddressSuggestion[] = results.slice(0, 6).map((r) => ({
        address: r.formatted_address as string,
        lat: r.geometry.location.lat as number,
        lon: r.geometry.location.lng as number,
      }));
      return { ok: true as const, suggestions };
    } catch {
      return { ok: false as const, suggestions: [] as AddressSuggestion[] };
    }
  });

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function geocodeOne(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `${BASE}?address=${encodeURIComponent(address)}&language=pt-BR&region=br&key=${key()}`;
    const res = await fetch(url);
    const json = (await res.json()) as any;
    const r = json?.results?.[0];
    if (!r) return null;
    return { lat: r.geometry.location.lat, lon: r.geometry.location.lng };
  } catch {
    return null;
  }
}

/** Calcula a distância estimada (km) entre origem e destino */
export const computeRouteKm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        origin: z.string().min(2).max(300),
        destination: z.string().min(2).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const a = await geocodeOne(data.origin);
    const b = await geocodeOne(data.destination);
    if (!a || !b) return { ok: false as const, km: 0 };
    // fator ~1.35 para aproximar distância por estrada vs. linha reta
    const km = Math.round(haversineKm(a, b) * 1.35 * 10) / 10;
    return { ok: true as const, km };
  });
