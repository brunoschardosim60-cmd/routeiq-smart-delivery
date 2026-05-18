import { useQuery } from "@tanstack/react-query";
import { listCompanyMembers } from "./company-members.functions";
import type { Driver } from "./mock-data";

export function useCompanyDrivers(): Driver[] {
  const q = useQuery({
    queryKey: ["company-members"],
    queryFn: () => listCompanyMembers(),
    staleTime: 30_000,
  });
  const members = q.data?.members ?? [];
  return members
    .filter((m) => m.roles.length === 0 || m.roles.includes("motorista"))
    .map(toDriver);
}

function toDriver(m: { id: string; full_name: string | null; created_at: string }): Driver {
  const name = m.full_name?.trim() || "Sem nome";
  const parts = name.split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  return {
    id: `auth-${m.id}`,
    name,
    initials,
    vehicle: "—",
    plate: "—",
    status: "disponivel",
    company: "BS",
    dailyRate: 0,
    secondTripRate: 0,
    monthlyTarget: 0,
    deliveriesToday: 0,
    kmToday: 0,
    lastActivity: "Cadastrou-se",
    admissionDate: m.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    totalDeliveries: 0,
    totalDays: 0,
    totalKm: 0,
    avgKmL: 0,
    cnh: "",
    phone: "",
    cpf: "",
  };
}
