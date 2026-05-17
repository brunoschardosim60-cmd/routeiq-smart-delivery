import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyDriverProfile,
  listDriverProfiles,
  upsertDriverProfile,
  type DriverProfileRow,
} from "./driver-profile.functions";

export function useDriverProfiles() {
  return useQuery({
    queryKey: ["driver-profiles"],
    queryFn: () => listDriverProfiles(),
    staleTime: 30_000,
  });
}

export function useDriverProfileMap(): Map<string, DriverProfileRow> {
  const q = useDriverProfiles();
  const map = new Map<string, DriverProfileRow>();
  (q.data?.rows ?? []).forEach((r) => map.set(r.user_id, r));
  return map;
}

export function useMyDriverProfile() {
  return useQuery({
    queryKey: ["driver-profile", "me"],
    queryFn: () => getMyDriverProfile(),
    staleTime: 30_000,
  });
}

export function useUpsertDriverProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof upsertDriverProfile>[0]) =>
      upsertDriverProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-profiles"] });
      qc.invalidateQueries({ queryKey: ["driver-profile", "me"] });
    },
  });
}
