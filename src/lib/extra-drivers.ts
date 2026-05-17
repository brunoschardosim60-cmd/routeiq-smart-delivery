// Drivers cadastrados pelo Admin (localStorage)
import { useEffect, useState } from "react";
import type { Driver, Company, DriverStatus } from "./mock-data";

const KEY = "routeiq.extraDrivers";
type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

function read(): Driver[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(arr: Driver[]) {
  localStorage.setItem(KEY, JSON.stringify(arr));
  notify();
}

export interface NewDriverInput {
  name: string;
  company: Company;
  vehicle: string;
  plate: string;
  dailyRate: number;
  secondTripRate: number;
  monthlyTarget: number;
  cnh?: string;
  phone?: string;
  cpf?: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function getExtraDrivers(): Driver[] { return read(); }

export function addExtraDriver(input: NewDriverInput): Driver {
  const today = new Date().toISOString().slice(0, 10);
  const drv: Driver = {
    id: `drv-${Date.now()}`,
    name: input.name.trim(),
    initials: initials(input.name),
    vehicle: input.vehicle,
    plate: input.plate.toUpperCase(),
    status: "disponivel" as DriverStatus,
    company: input.company,
    dailyRate: input.dailyRate,
    secondTripRate: input.secondTripRate,
    monthlyTarget: input.monthlyTarget,
    deliveriesToday: 0,
    kmToday: 0,
    lastActivity: "Cadastrado agora",
    admissionDate: today,
    totalDeliveries: 0,
    totalDays: 0,
    totalKm: 0,
    avgKmL: 0,
    cnh: input.cnh ?? "",
    phone: input.phone ?? "",
    cpf: input.cpf ?? "",
  };
  write([drv, ...read()]);
  return drv;
}

export function removeExtraDriver(id: string) {
  write(read().filter((d) => d.id !== id));
}

export function useExtraDrivers(): Driver[] {
  const [arr, setArr] = useState<Driver[]>([]);
  useEffect(() => {
    setArr(read());
    const cb = () => setArr(read());
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return arr;
}
