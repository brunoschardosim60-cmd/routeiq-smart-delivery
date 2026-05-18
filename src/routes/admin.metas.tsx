import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { Progress } from "@/components/ui/progress";
import { routesData } from "@/lib/mock-data";
import { useAssignedRoutes } from "@/lib/assigned-routes";
import { computePayroll, computeMonthlyMeta, summarizeByCompany } from "@/lib/payroll";
import { brl, num, pct } from "@/lib/format";

export const Route = createFileRoute("/admin/metas")({
  component: MetasPage,
});

function MetasPage() {
  const assigned = useAssignedRoutes();
  const [month, setMonth] = useState("2025-05");
  const [companyFilter, setCompanyFilter] = useState<"all" | "DBM" | "BS">("all");

  const paid = useMemo(() => computePayroll([...routesData, ...assigned]), [assigned]);
  const metas = useMemo(() => computeMonthlyMeta(paid, month), [paid, month]);
  const companies = useMemo(() => summarizeByCompany(metas), [metas]);

  const list = companyFilter === "all" ? metas : metas.filter((m) => m.driver.company === companyFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas Mensais</h1>
          <p className="text-sm text-muted-foreground">Entregas no mês × meta · impacto das 2ª saídas</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value as "all" | "DBM" | "BS")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todas as empresas</option>
            <option value="DBM">DBM</option>
            <option value="BS">BS Soluções</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {companies.map((c) => (
          <Card key={c.company}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{c.company === "BS" ? "BS Soluções" : "DBM"}</span>
                <span className={`text-xs font-semibold ${c.pctTarget >= 100 ? "text-success" : c.pctTarget >= 70 ? "text-info" : "text-warning"}`}>
                  {pct(c.pctTarget)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={Math.min(c.pctTarget, 100)} className="h-2" />
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Motoristas</p><p className="font-semibold">{c.drivers}</p></div>
                <div><p className="text-xs text-muted-foreground">Entregas</p><p className="font-semibold">{num(c.deliveries)}</p></div>
                <div><p className="text-xs text-muted-foreground">Meta</p><p className="font-semibold">{num(c.target)}</p></div>
                <div><p className="text-xs text-muted-foreground">2ª saídas</p><p className="font-semibold text-info">{c.secondTrips}</p></div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Pago no mês</p>
                  <p className="text-base font-semibold">{brl(c.totalPaid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Diárias <span className="text-foreground">{brl(c.baseFromDaily)}</span></p>
                  <p className="text-muted-foreground">2ª saídas <span className="text-info">{brl(c.extraFromSecondTrips)}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Motoristas" value={String(list.length)} />
        <MetricCard label="Entregas no mês" value={num(list.reduce((s, m) => s + m.deliveries, 0))} accent="info" />
        <MetricCard label="2ª saídas" value={String(list.reduce((s, m) => s + m.secondTrips, 0))} accent="warning" />
        <MetricCard label="Total a pagar" value={brl(list.reduce((s, m) => s + m.totalPaid, 0))} accent="success" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento por motorista</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Motorista</th>
                <th className="pb-2 font-medium">Empresa</th>
                <th className="pb-2 font-medium">Rotas</th>
                <th className="pb-2 font-medium">Entregas</th>
                <th className="pb-2 font-medium">Meta</th>
                <th className="pb-2 font-medium">% Meta</th>
                <th className="pb-2 font-medium">2ª saídas</th>
                <th className="pb-2 font-medium">Diárias</th>
                <th className="pb-2 font-medium">Extras</th>
                <th className="pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.driver.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">
                    <Link to="/admin/motoristas/$driverId" params={{ driverId: m.driver.id }} className="hover:underline">
                      {m.driver.name}
                    </Link>
                  </td>
                  <td className="py-3"><span className={`rounded-md border px-2 py-0.5 text-[11px] ${m.driver.company === "DBM" ? "border-primary/30 bg-primary/10 text-primary" : "border-success/30 bg-success/10 text-success"}`}>{m.driver.company === "BS" ? "BS Soluções" : "DBM"}</span></td>
                  <td className="py-3">{m.routes}</td>
                  <td className="py-3">{num(m.deliveries)}</td>
                  <td className="py-3 text-muted-foreground">{num(m.target)}</td>
                  <td className="py-3" style={{ minWidth: 140 }}>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(m.pctTarget, 100)} className="h-1.5 w-20" />
                      <span className={`text-xs ${m.pctTarget >= 100 ? "text-success" : m.pctTarget >= 70 ? "text-info" : "text-warning"}`}>{pct(m.pctTarget)}</span>
                    </div>
                  </td>
                  <td className="py-3"><span className="text-info">{m.secondTrips}</span></td>
                  <td className="py-3">{brl(m.baseFromDaily)}</td>
                  <td className="py-3 text-info">{brl(m.extraFromSecondTrips)}</td>
                  <td className="py-3 font-semibold text-success">{brl(m.totalPaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
