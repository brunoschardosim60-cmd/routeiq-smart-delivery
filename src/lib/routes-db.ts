import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAssignedRoutes,
  createAssignedRoute,
  deleteAssignedRoute,
  type RouteDbRow,
} from "./routes-db.functions";
import type { Company, RouteRow, RouteStatus } from "./mock-data";

const QK = ["assigned-routes-db"] as const;

function isoToBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function rowToRouteRow(r: RouteDbRow): RouteRow {
  return {
    id: r.id,
    code: r.code,
    date: isoToBR(r.date_iso),
    dateISO: r.date_iso,
    driverId: r.driver_id,
    driverName: r.driver_name,
    company: "BS" as Company,
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
    isSecondTrip: false,
  };
}

export function useDbAssignedRoutes() {
  const q = useQuery({
    queryKey: QK,
    queryFn: () => listAssignedRoutes(),
    staleTime: 15_000,
  });
  return {
    rows: (q.data?.rows ?? []).map(rowToRouteRow),
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
