import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listFuelEntries,
  createFuelEntry,
  deleteFuelEntry,
  type FuelDbRow,
} from "./fuel-db.functions";

const QK = ["fuel-entries-db"] as const;

function isoToBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export interface FuelUI {
  id: string;
  driverId: string;
  date: string;
  dateISO: string;
  driverName: string;
  vehicle: string;
  plate: string;
  liters: number;
  pricePerL: number;
  total: number;
  odometer: number;
  station?: string;
  notes?: string;
  assignedRouteId?: string | null;
}

export function rowToFuelUI(r: FuelDbRow): FuelUI {
  return {
    id: r.id,
    driverId: r.driver_id,
    date: isoToBR(r.date_iso),
    dateISO: r.date_iso,
    driverName: r.driver_name,
    vehicle: r.vehicle ?? "—",
    plate: r.plate ?? "—",
    liters: Number(r.liters),
    pricePerL: Number(r.price_per_l),
    total: Number(r.total),
    odometer: Number(r.odometer ?? 0),
    station: r.station ?? undefined,
    notes: r.notes ?? undefined,
    assignedRouteId: r.assigned_route_id ?? null,
  };
}

export function useDbFuelEntries() {
  const q = useQuery({
    queryKey: QK,
    queryFn: () => listFuelEntries(),
    staleTime: 15_000,
  });
  return {
    rows: (q.data?.rows ?? []).map(rowToFuelUI),
    raw: q.data?.rows ?? [],
    isLoading: q.isLoading,
  };
}

export interface CreateFuelInput {
  driverId?: string;
  driverName: string;
  dateISO: string;
  vehicle?: string | null;
  plate?: string | null;
  liters: number;
  pricePerL: number;
  odometer?: number | null;
  station?: string | null;
  notes?: string | null;
  assignedRouteId?: string | null;
}

export function useCreateFuelEntry() {
  const fn = useServerFn(createFuelEntry);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFuelInput) => fn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteFuelEntry() {
  const fn = useServerFn(deleteFuelEntry);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
