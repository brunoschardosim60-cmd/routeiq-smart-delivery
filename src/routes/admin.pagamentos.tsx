import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { routesData } from "@/lib/mock-data";
import { useAssignedRoutes } from "@/lib/assigned-routes";
import { computePayroll } from "@/lib/payroll";
import { brl, num, parseISODate, todayISO } from "@/lib/format";
import { useCurrentCompany } from "@/lib/current-company";

export const Route = createFileRoute("/admin/pagamentos")({
  component: PagamentosPage,
});

function PagamentosPage() {
  const assigned = useAssignedRoutes();
  const [scope] = useCurrentCompany();
  const company: "all" | "DBM" | "BS" = scope === "todas" ? "all" : scope;
  const [period, setPeriod] = useState("month");

  const paid = useMemo(() => computePayroll([...routesData, ...assigned]), [assigned]);
  const filtered = useMemo(() => {
    const today = parseISODate(todayISO());
    return paid.filter((r) => {
      if (company !== "all" && r.company !== company) return false;
      const diff = (today.getTime() - parseISODate(r.dateISO).getTime()) / 86400000;
      if (period === "today" && !(diff >= 0 && diff < 1)) return false;
      if (period === "week" && diff > 7) return false;
      if (period === "month" && diff > 30) return false;
      return true;
    });
  }, [paid, company, period]);

  const totals = useMemo(() => {
    const dbm = filtered.filter((r) => r.company === "DBM");
    const bs = filtered.filter((r) => r.company === "BS");
    const sum = (arr: typeof filtered) => ({
      diaria: arr.reduce((s, r) => s + r.payDaily, 0),
      extra: arr.reduce((s, r) => s + r.payExtra, 0),
      total: arr.reduce((s, r) => s + r.payTotal, 0),
      qtd: arr.length,
      saidas2: arr.filter((r) => r.isSecondTripAuto).length,
    });
    return { all: sum(filtered), dbm: sum(dbm), bs: sum(bs) };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagamentos por Rota</h1>
          <p className="text-sm text-muted-foreground">Diária + 2ª saída calculados automaticamente por rota</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Últimos 30 dias</option>
            <option value="all">Todo período</option>
          </select>
          <span className="rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground">
            Empresa: <span className="font-medium text-foreground">{company === "all" ? "Todas" : company === "BS" ? "BS Soluções" : "DBM"}</span>
          </span>

        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Rotas" value={num(totals.all.qtd)} />
        <MetricCard label="2ª saídas" value={num(totals.all.saidas2)} accent="info" />
        <MetricCard label="Diárias" value={brl(totals.all.diaria)} accent="success" />
        <MetricCard label="Total pago" value={brl(totals.all.total)} accent="success" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          { key: "DBM", title: "DBM", data: totals.dbm },
          { key: "BS", title: "BS Soluções", data: totals.bs },
        ] as const).map((c) => (
          <Card key={c.key}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{c.title}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Rotas</p><p className="font-semibold">{c.data.qtd}</p></div>
                <div><p className="text-xs text-muted-foreground">2ª saídas</p><p className="font-semibold text-info">{c.data.saidas2}</p></div>
                <div><p className="text-xs text-muted-foreground">Diárias</p><p className="font-semibold">{brl(c.data.diaria)}</p></div>
                <div><p className="text-xs text-muted-foreground">Extras</p><p className="font-semibold text-info">{brl(c.data.extra)}</p></div>
              </div>
              <div className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm">
                Total a pagar — <span className="font-semibold text-success">{brl(c.data.total)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhe por rota</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Saída</th>
                <th className="pb-2 font-medium">Motorista</th>
                <th className="pb-2 font-medium">Empresa</th>
                <th className="pb-2 font-medium">Rota</th>
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium">Diária</th>
                <th className="pb-2 font-medium">2ª saída</th>
                <th className="pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">Sem rotas no período.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">{r.date}</td>
                  <td className="py-3 font-mono text-xs">{r.departure}</td>
                  <td className="py-3">{r.driverName}</td>
                  <td className="py-3"><span className={`rounded-md border px-2 py-0.5 text-[11px] ${r.company === "DBM" ? "border-primary/30 bg-primary/10 text-primary" : "border-success/30 bg-success/10 text-success"}`}>{r.company === "BS" ? "BS Soluções" : "DBM"}</span></td>
                  <td className="py-3 font-mono text-xs">{r.code}</td>
                  <td className="py-3">
                    {r.isSecondTripAuto
                      ? <span className="rounded-full bg-info/15 text-info border border-info/30 px-2 py-0.5 text-[10px] font-medium">2ª saída</span>
                      : <span className="rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium">Diária</span>}
                  </td>
                  <td className="py-3">{r.payDaily ? brl(r.payDaily) : "—"}</td>
                  <td className="py-3 text-info">{r.payExtra ? brl(r.payExtra) : "—"}</td>
                  <td className="py-3 font-semibold text-success">{brl(r.payTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        Regra: para cada motorista no mesmo dia, a 1ª rota (menor horário de saída) é remunerada como diária; rotas adicionais entram como 2ª saída usando o valor configurado no perfil do motorista.
      </p>
    </div>
  );
}
