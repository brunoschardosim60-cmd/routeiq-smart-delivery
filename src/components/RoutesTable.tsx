import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { drivers, type RouteRow } from "@/lib/mock-data";
import { computePayroll } from "@/lib/payroll";
import { brl, parseISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";

type SortKey = "date" | "driverName" | "totalDeliveries" | "km" | "cost" | "status";
type SortDir = "asc" | "desc";

function inPeriod(dateISO: string, period: string): boolean {
  if (period === "all") return true;
  // referência: hoje = 2025-05-14 (mock)
  const today = parseISODate("2025-05-14");
  const d = parseISODate(dateISO);
  const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (period === "today") return diff < 1 && diff >= 0;
  if (period === "week") return diff <= 7;
  if (period === "month") return diff <= 30;
  return true;
}

interface Props {
  rows: RouteRow[];
  showDriverFilter?: boolean;
  showActions?: boolean;
  driverIdFilter?: string; // restringe a um motorista (motorista logado)
  showCompanyFilter?: boolean;
}

export function RoutesTable({
  rows,
  showDriverFilter = true,
  showActions = true,
  driverIdFilter,
  showCompanyFilter = true,
}: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [driverId, setDriverId] = useState(driverIdFilter ?? "all");
  const [company, setCompany] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });

  const enriched = useMemo(() => {
    const map = new Map(computePayroll(rows).map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, isSecondTrip: map.get(r.id)?.isSecondTripAuto ?? r.isSecondTrip }));
  }, [rows]);

  const filtered = useMemo(() => {
    let arr = enriched;
    if (driverIdFilter) arr = arr.filter((r) => r.driverId === driverIdFilter);
    return arr.filter((r) => {
      if (q) {
        const t = q.toLowerCase();
        if (
          !r.code.toLowerCase().includes(t) &&
          !r.driverName.toLowerCase().includes(t) &&
          !r.origin.toLowerCase().includes(t)
        ) return false;
      }
      if (status !== "all" && r.status !== status) return false;
      if (driverId !== "all" && r.driverId !== driverId) return false;
      if (company !== "all" && r.company !== company) return false;
      if (!inPeriod(r.dateISO, period)) return false;
      return true;
    });
  }, [enriched, q, status, driverId, company, period, driverIdFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = a[sort.key] as never;
      let bv: string | number = b[sort.key] as never;
      if (sort.key === "date") { av = a.dateISO; bv = b.dateISO; }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key !== k
      ? <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />
      : sort.dir === "asc"
        ? <ArrowUp className="ml-1 inline h-3 w-3" />
        : <ArrowDown className="ml-1 inline h-3 w-3" />;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código, motorista ou origem..."
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">Todo período</option>
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Últimos 30 dias</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">Todos os status</option>
            <option value="em_andamento">Em andamento</option>
            <option value="atrasado">Atrasado</option>
            <option value="concluido">Concluído</option>
            <option value="problema">Problema</option>
          </select>
          {showDriverFilter && !driverIdFilter && (
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="all">Todos os motoristas</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          {showCompanyFilter && (
            <select value={company} onChange={(e) => setCompany(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="all">Todas as empresas</option>
              <option value="DBM">DBM</option>
              <option value="BS">BS Soluções</option>
            </select>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{sorted.length} rota(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  Data <SortIcon k="date" />
                </th>
                <th className="pb-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("driverName")}>
                  Motorista <SortIcon k="driverName" />
                </th>
                <th className="pb-2 font-medium">Empresa</th>
                <th className="pb-2 font-medium">Código</th>
                <th className="pb-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("totalDeliveries")}>
                  Entregas <SortIcon k="totalDeliveries" />
                </th>
                <th className="pb-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("km")}>
                  KM <SortIcon k="km" />
                </th>
                <th className="pb-2 font-medium">Duração</th>
                <th className="pb-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("cost")}>
                  Custo <SortIcon k="cost" />
                </th>
                <th className="pb-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  Status <SortIcon k="status" />
                </th>
                {showActions && <th className="pb-2 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma rota encontrada com esses filtros.
                  </td>
                </tr>
              )}
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 transition-colors hover:bg-accent/40">
                  <td className="py-3">{r.date}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span>{r.driverName}</span>
                      {r.isSecondTrip && (
                        <span className="rounded-full border border-info/30 bg-info/15 px-1.5 py-0.5 text-[10px] font-medium text-info">
                          2ª saída
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-medium border",
                      r.company === "DBM"
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-success/10 text-success border-success/30",
                    )}>
                      {r.companyName ?? (r.company === "BS" ? "BS Soluções" : "DBM")}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      {r.code}
                      {r.comproveiExternalId && (
                        <span
                          title={`Importado do Comprovei · ${r.comproveiExternalId}`}
                          className="rounded-full border border-info/30 bg-info/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-info"
                        >
                          Comprovei
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px]">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              r.done >= r.totalDeliveries ? "bg-success" : "bg-primary",
                            )}
                            style={{ width: `${r.totalDeliveries ? Math.min(100, (r.done / r.totalDeliveries) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">{r.done}/{r.totalDeliveries}</span>
                    </div>
                  </td>
                  <td className="py-3">{r.km} km</td>
                  <td className="py-3">{r.duration}</td>
                  <td className="py-3">{brl(r.cost)}</td>
                  <td className="py-3"><StatusBadge status={r.status} /></td>
                  {showActions && (
                    <td className="py-3">
                      <Link
                        to="/admin/rotas/$routeId"
                        params={{ routeId: r.id }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                      >
                        <Eye className="h-3 w-3" /> Detalhes
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
