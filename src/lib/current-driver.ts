// Mock helper: retorna o driverId do motorista atualmente logado.
// Hoje a auth é mockada (sessionStorage). Quando migrar para Supabase Auth,
// basta trocar para auth.uid() e mapear via tabela profiles.driver_id.
const KEY = "routeiq_current_driver_id";
const DEFAULT_DRIVER_ID = "drv-1"; // Carlos Silva

export function getCurrentDriverId(): string {
  if (typeof window === "undefined") return DEFAULT_DRIVER_ID;
  return sessionStorage.getItem(KEY) ?? DEFAULT_DRIVER_ID;
}

export function setCurrentDriverId(id: string) {
  if (typeof window !== "undefined") sessionStorage.setItem(KEY, id);
}
