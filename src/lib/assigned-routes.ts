// Mini "store" de rotas atribuídas pelo Admin (mockado em localStorage)
import { useEffect, useState } from "react";
import { drivers, type Company, type RouteRow, type RouteStatus } from "./mock-data";
import { getExtraDrivers } from "./extra-drivers";

const KEY = "routeiq.assignedRoutes";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() { listeners.forEach((l) => l()); }

function read(): RouteRow[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function write(arr: RouteRow[]) {
  localStorage.setItem(KEY, JSON.stringify(arr));
  notify();
}

export function getAssignedRoutes(): RouteRow[] { return read(); }

export interface NewRouteInput {
  driverId: string;
  driverName?: string;     // fallback se o motorista não estiver na lista (ex: cadastro via login)
  driverCompany?: Company; // fallback de empresa
  dateISO: string;
  departure: string;
  expectedReturn: string;
  origin: string;
  destination?: string;
  totalDeliveries: number;
  km?: number;
  kmStart?: number;
  kmEnd?: number;
  notes?: string;
}

export function addAssignedRoute(input: NewRouteInput): RouteRow {
  const drv = drivers.find((d) => d.id === input.driverId)
    ?? getExtraDrivers().find((d) => d.id === input.driverId);
  const driverName = drv?.name ?? input.driverName ?? "Motorista";
  const driverCompany: Company = drv?.company ?? input.driverCompany ?? "BS";
  const all = read();
  const seq = all.length + 1;
  const [y, m, d] = input.dateISO.split("-");
  const code = `RT-A${String(2500 + seq).padStart(4, "0")}`;
  const status: RouteStatus = "em_andamento";
  const revenue = input.totalDeliveries * 42;
  const cost = revenue * 0.36;
  const computedKm =
    typeof input.km === "number"
      ? input.km
      : input.kmStart != null && input.kmEnd != null
        ? Math.max(0, input.kmEnd - input.kmStart)
        : 0;
  const originLabel = input.destination ? `${input.origin} → ${input.destination}` : input.origin;
  const row: RouteRow = {
    id: `assigned-${Date.now()}`,
    code,
    date: `${d}/${m}/${y}`,
    dateISO: input.dateISO,
    driverId: input.driverId,
    driverName,
    company: driverCompany,
    origin: originLabel,
    totalDeliveries: input.totalDeliveries,
    done: 0,
    km: computedKm,
    duration: "—",
    cost: +cost.toFixed(2),
    revenue: +revenue.toFixed(2),
    status,
    departure: input.departure,
    expectedReturn: input.expectedReturn,
    isSecondTrip: false, // recalculado pelo payroll
  };
  write([row, ...all]);
  return row;
}

export function removeAssignedRoute(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function useAssignedRoutes(): RouteRow[] {
  const [arr, setArr] = useState<RouteRow[]>([]);
  useEffect(() => {
    setArr(read());
    const cb = () => setArr(read());
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return arr;
}
