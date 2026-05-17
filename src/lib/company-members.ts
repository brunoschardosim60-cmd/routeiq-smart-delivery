import { useQuery } from "@tanstack/react-query";
import { listCompanyMembers } from "./company-members.functions";
import { useDriverProfileMap } from "./driver-profile";
import type { Driver } from "./mock-data";

export function useCompanyDrivers(): Driver[] {
  const q = useQuery({
    queryKey: ["company-members"],
    queryFn: () => listCompanyMembers(),
    staleTime: 30_000,
  });
  const profiles = useDriverProfileMap();
  const members = q.data?.members ?? [];
  return members
    .filter((m) => m.roles.length === 0 || m.roles.includes("motorista"))
    .map((m) => toDriver(m, profiles.get(m.id)));
}

function toDriver(
  m: { id: string; full_name: string | null; created_at: string },
  profile?: {
    daily_rate: number;
    second_trip_rate: number;
    monthly_target: number;
    vehicle: string | null;
    plate: string | null;
    cnh: string | null;
    phone: string | null;
    cpf: string | null;
  },
): Driver {
  const name = m.full_name?.trim() || "Sem nome";
  const parts = name.split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  return {
    id: m.id,
    name,
    initials,
    vehicle: profile?.vehicle || "—",
    plate: profile?.plate || "—",
    status: "disponivel",
    company: "BS",
    dailyRate: Number(profile?.daily_rate ?? 0),
    secondTripRate: Number(profile?.second_trip_rate ?? 0),
    monthlyTarget: profile?.monthly_target ?? 0,
    deliveriesToday: 0,
    kmToday: 0,
    lastActivity: "Cadastrou-se",
    admissionDate: m.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    totalDeliveries: 0,
    totalDays: 0,
    totalKm: 0,
    avgKmL: 0,
    cnh: profile?.cnh ?? "",
    phone: profile?.phone ?? "",
    cpf: profile?.cpf ?? "",
  };
}
