import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAssignedRoutes,
  createAssignedRoute,
  deleteAssignedRoute,
  finishAssignedRoute,
  updateAssignedRoute,
  recalcRoutesForClient,
  type RouteDbRow,
} from "./routes-db.functions";
import type { Company, RouteRow, RouteStatus } from "./mock-data";
import { useAuth } from "@/hooks/use-auth";

const QK = ["assigned-routes-db"] as const;

function isoToBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Mapeia o nome da empresa para o tag legado (DBM/BS). Default DBM. */
function companyTag(name?: string | null): Company {
  if (!name) return "DBM";
  const upper = name.toUpperCase();
  if (upper.includes("BS")) return "BS";
  return "DBM";
}

export function rowToRouteRow(r: RouteDbRow, companyName?: string | null): RouteRow {
  return {
    id: r.id,
    code: r.code,
    date: isoToBR(r.date_iso),
    dateISO: r.date_iso,
    driverId: r.driver_id,
    driverName: r.driver_name,
    company: companyTag(companyName),
    companyName: companyName ?? null,
    origin: r.origin,
    totalDeliveries: r.total_deliveries,
    done: r.done,
    km: Number(r.km ?? 0),
    duration: "—",
    cost: Number(r.cost ?? 0),
    revenue: Number(r.revenue ?? 0),
    status: (r.status as RouteStatus) ?? "em_andamento",
    departure: r.departure ?? "",
    expectedReturn: r.expected_return ?? "",
    isSecondTrip: r.trip_type === "segunda",
    driverPay: Number(r.driver_pay ?? 0),
    tripType: (r.trip_type as RouteRow["tripType"]) ?? "diaria",
    clientCompanyId: r.client_company_id ?? null,
    destinationLat: (r as any).destination_lat ?? null,
    destinationLon: (r as any).destination_lon ?? null,
    originLat: (r as any).origin_lat ?? null,
    originLon: (r as any).origin_lon ?? null,
    comproveiExternalId: r.comprovei_external_id ?? null,
  };
}

export function useDbAssignedRoutes() {
  const { company } = useAuth();
  const q = useQuery({
    queryKey: QK,
    queryFn: () => listAssignedRoutes(),
    staleTime: 15_000,
  });
  const companyName = company?.name ?? null;
  return {
    rows: (q.data?.rows ?? []).map((r) => rowToRouteRow(r, companyName)),
    raw: q.data?.rows ?? [],
    isLoading: q.isLoading,
  };
}

export interface CreateRouteInput {
  driverId: string;
  driverName: string;
  dateISO: string;
  departure?: string;
  expectedReturn?: string;
  origin: string;
  destination?: string | null;
  totalDeliveries?: number;
  km?: number;
  kmStart?: number | null;
  kmEnd?: number | null;
  cost?: number;
  revenue?: number;
  notes?: string | null;
  clientCompanyId?: string | null;
  tripType?: "diaria" | "segunda" | "avulsa";
  driverPay?: number;
}

export function useCreateAssignedRoute() {
  const fn = useServerFn(createAssignedRoute);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRouteInput) => fn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteAssignedRoute() {
  const fn = useServerFn(deleteAssignedRoute);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export interface FinishRouteInput {
  id: string;
  kmEnd?: number | null;
  notes?: string | null;
  proofPhotoUrl?: string | null;
}

export function useFinishAssignedRoute() {
  const fn = useServerFn(finishAssignedRoute);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FinishRouteInput) => fn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export interface UpdateRouteInput {
  id: string;
  revenue?: number;
  driverPay?: number;
  cost?: number;
  km?: number;
  kmEnd?: number | null;
  notes?: string | null;
}

export function useUpdateAssignedRoute() {
  const fn = useServerFn(updateAssignedRoute);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRouteInput) => fn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useRecalcRoutesForClient() {
  const fn = useServerFn(recalcRoutesForClient);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clientCompanyId: string) => fn({ data: { clientCompanyId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
