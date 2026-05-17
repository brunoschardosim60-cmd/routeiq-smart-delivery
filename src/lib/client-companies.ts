import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listClientCompanies,
  upsertClientCompany,
  deleteClientCompany,
  type ClientCompanyRow,
} from "./client-companies.functions";

const QK = ["client-companies"] as const;

export function useClientCompanies() {
  const q = useQuery({
    queryKey: QK,
    queryFn: () => listClientCompanies(),
    staleTime: 30_000,
  });
  return {
    rows: (q.data?.rows ?? []) as ClientCompanyRow[],
    isLoading: q.isLoading,
  };
}

export interface UpsertClientCompanyInput {
  id?: string;
  name: string;
  dailyAdminRate: number;
  dailyDriverRate: number;
  secondAdminRate: number;
  secondDriverRate: number;
  active: boolean;
}

export function useUpsertClientCompany() {
  const fn = useServerFn(upsertClientCompany);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertClientCompanyInput) => fn({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteClientCompany() {
  const fn = useServerFn(deleteClientCompany);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
