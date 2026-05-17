import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

export interface AddressSuggestion {
  label: string;
  lat: number;
  lon: number;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (s: AddressSuggestion) => void;
  /** Centro de viés para priorizar resultados próximos (ex.: cidade do CD). */
  biasLat?: number | null;
  biasLon?: number | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  biasLat,
  biasLon,
  placeholder,
  required,
  className,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const lastQueryRef = useRef("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3 || q === lastQueryRef.current) return;
    const t = setTimeout(async () => {
      lastQueryRef.current = q;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          format: "json",
          limit: "6",
          countrycodes: "br",
          addressdetails: "1",
          q,
        });
        if (biasLat != null && biasLon != null) {
          // viewbox ~ ±1° (~110km) ao redor para priorizar resultados próximos
          const dlat = 1, dlon = 1;
          params.set(
            "viewbox",
            `${biasLon - dlon},${biasLat + dlat},${biasLon + dlon},${biasLat - dlat}`,
          );
          params.set("bounded", "0");
        }
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { headers: { Accept: "application/json" } },
        );
        const data = await res.json();
        const arr: AddressSuggestion[] = Array.isArray(data)
          ? data.map((d: any) => ({
              label: d.display_name as string,
              lat: parseFloat(d.lat),
              lon: parseFloat(d.lon),
            }))
          : [];
        setItems(arr);
        setOpen(arr.length > 0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value, biasLat, biasLon]);

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={inputCls}
      />
      {loading && (
        <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && items.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {items.map((it, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onChange(it.label);
                  onSelect?.(it);
                  setOpen(false);
                  lastQueryRef.current = it.label;
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { getOsrmKm } from "@/lib/osrm";

/** Distância via OSRM (roteamento real, com cache local). Fallback haversine embutido. */
export async function computeRouteKm(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
): Promise<number> {
  const km = await getOsrmKm(origin, destination);
  return +km.toFixed(1);
}
