// Mock: empresa que o admin está gerenciando.
// Cada empresa (DBM / BS) só vê seus próprios dados.
// "todas" é usado apenas para super-admin (debug).
import { useEffect, useState } from "react";
import type { Company } from "./mock-data";

export type CompanyScope = Company | "todas";

const KEY = "routeiq.currentCompany";
const DEFAULT: CompanyScope = "DBM";

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

export function getCurrentCompany(): CompanyScope {
  if (typeof window === "undefined") return DEFAULT;
  return ((sessionStorage.getItem(KEY) as CompanyScope | null) ?? DEFAULT);
}

export function setCurrentCompany(c: CompanyScope) {
  if (typeof window !== "undefined") sessionStorage.setItem(KEY, c);
  notify();
}

export function useCurrentCompany(): [CompanyScope, (c: CompanyScope) => void] {
  const [v, setV] = useState<CompanyScope>(() => getCurrentCompany());
  useEffect(() => {
    const cb = () => setV(getCurrentCompany());
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return [v, setCurrentCompany];
}

export function companyLabel(c: CompanyScope): string {
  if (c === "BS") return "BS Soluções";
  if (c === "DBM") return "DBM";
  return "Todas as empresas";
}

// Helper genérico para filtrar listas que tenham `company`
export function filterByCompany<T extends { company?: Company }>(
  list: T[],
  scope: CompanyScope,
): T[] {
  if (scope === "todas") return list;
  return list.filter((x) => x.company === scope);
}
