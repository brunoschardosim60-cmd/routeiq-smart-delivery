import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listRouteStops,
  addRouteStops,
  updateStopStatus,
  deleteRouteStop,
  startRoute,
  finishRoute,
  updateRouteLocation,
  type RouteStopRow,
} from "./route-stops.functions";

export type { RouteStopRow };

export function useRouteStops(routeId: string | undefined) {
  const fn = useServerFn(listRouteStops);
  const q = useQuery({
    queryKey: ["route-stops", routeId],
    queryFn: () => fn({ data: { routeId: routeId! } }),
    enabled: !!routeId,
    refetchInterval: 20_000,
  });
  return { stops: q.data?.rows ?? [], isLoading: q.isLoading };
}

export function useAddRouteStops(routeId: string) {
  const fn = useServerFn(addRouteStops);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stops: { clientName?: string | null; address: string; note?: string | null }[]) =>
      fn({ data: { routeId, stops } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops", routeId] });
      qc.invalidateQueries({ queryKey: ["assigned-routes-db"] });
    },
  });
}

export function useUpdateStopStatus(routeId: string) {
  const fn = useServerFn(updateStopStatus);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: "pendente" | "entregue" | "falha"; note?: string | null }) =>
      fn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops", routeId] });
      qc.invalidateQueries({ queryKey: ["assigned-routes-db"] });
    },
  });
}

export function useDeleteRouteStop(routeId: string) {
  const fn = useServerFn(deleteRouteStop);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["route-stops", routeId] }),
  });
}

export function useStartRoute(routeId: string) {
  const fn = useServerFn(startRoute);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fn({ data: { routeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assigned-routes-db"] }),
  });
}

export function useFinishRoute(routeId: string) {
  const fn = useServerFn(finishRoute);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fn({ data: { routeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assigned-routes-db"] }),
  });
}

export function useUpdateRouteLocation(routeId: string) {
  const fn = useServerFn(updateRouteLocation);
  return useMutation({
    mutationFn: (v: { lat: number; lon: number }) => fn({ data: { routeId, ...v } }),
  });
}
