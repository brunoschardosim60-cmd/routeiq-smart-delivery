import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { last4WeeksFinance, margin30d, routesData, drivers } from "@/lib/mock-data";
import { brl, pct } from "@/lib/format";
import { useCurrentCompany, filterByCompany } from "@/lib/current-company";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/financeiro")({
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const [scope] = useCurrentCompany();

  const filteredRoutes = useMemo(() => {
    if (scope === "todas") return routesData;
    const driverIds = new Set(drivers.filter((d) => d.company === scope).map((d) => d.id));
    return routesData.filter((r) => driverIds.has(r.driverId));
  }, [scope]);

  const totals = useMemo(() => {
    const revenue = filteredRoutes.reduce((s, r) => s + r.revenue, 0);
    const cost = filteredRoutes.reduce((s, r) => s + r.cost, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const deliveries = filteredRoutes.reduce((s, r) => s + r.totalDeliveries, 0);
    const km = filteredRoutes.reduce((s, r) => s + (r.km ?? 0), 0);
    return {
      revenue, cost, profit, margin,
      costPerKm: km > 0 ? cost / km : 0,
      costPerDelivery: deliveries > 0 ? cost / deliveries : 0,
      commissions: revenue * 0.18,
      ticket: filteredRoutes.length > 0 ? revenue / filteredRoutes.length : 0,
    };
  }, [filteredRoutes]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-xs text-muted-foreground">Empresa: <span className="font-medium text-foreground">{scope === "todas" ? "Todas" : scope}</span></p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option>Este mês</option><option>Última semana</option><option>Hoje</option></select>
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option>Todos os motoristas</option></select>
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option>Todas as rotas</option></select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Faturamento total" value={brl(totals.revenue)} accent="success" />
        <MetricCard label="Custo total" value={brl(totals.cost)} accent="warning" />
        <MetricCard label="Lucro líquido" value={brl(totals.profit)} accent="success" />
        <MetricCard label="Margem média" value={pct(totals.margin)} accent="info" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Custo médio por KM" value={brl(totals.costPerKm)} />
        <MetricCard label="Custo médio por entrega" value={brl(totals.costPerDelivery)} />
        <MetricCard label="Comissões pagas" value={brl(totals.commissions)} />
        <MetricCard label="Ticket médio por rota" value={brl(totals.ticket)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento × Custo × Lucro — últimas 4 semanas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={last4WeeksFinance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="faturamento" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Evolução da margem % — últimos 30 dias</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={margin30d}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="margem" stroke="var(--color-success)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Financeiro por rota</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Motorista</th>
                <th className="pb-2 font-medium">Rota</th>
                <th className="pb-2 font-medium">Entregas</th>
                <th className="pb-2 font-medium">Faturamento</th>
                <th className="pb-2 font-medium">Combustível</th>
                <th className="pb-2 font-medium">Comissão</th>
                <th className="pb-2 font-medium">Lucro</th>
                <th className="pb-2 font-medium">Margem</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.slice(0, 12).map((r) => {
                const fuel = r.cost * 0.45;
                const comm = r.revenue * 0.18;
                const profit = r.revenue - r.cost;
                const m = (profit / r.revenue) * 100;
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">{r.date}</td>
                    <td className="py-3">{r.driverName}</td>
                    <td className="py-3 font-mono text-xs">{r.code}</td>
                    <td className="py-3">{r.totalDeliveries}</td>
                    <td className="py-3">{brl(r.revenue)}</td>
                    <td className="py-3 text-muted-foreground">{brl(fuel)}</td>
                    <td className="py-3 text-muted-foreground">{brl(comm)}</td>
                    <td className="py-3 text-success">{brl(profit)}</td>
                    <td className="py-3">{pct(m)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
