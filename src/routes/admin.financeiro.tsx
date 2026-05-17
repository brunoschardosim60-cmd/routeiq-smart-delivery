import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useDbFuelEntries } from "@/lib/fuel-db";
import { brl, num, pct, parseISODate, todayISO } from "@/lib/format";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/financeiro")({
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { rows } = useDbAssignedRoutes();
  const { rows: fuel } = useDbFuelEntries();
  const [period, setPeriod] = useState("month");

  const filtered = useMemo(() => {
    const today = parseISODate(todayISO());
    return rows.filter((r) => {
      if (r.status !== "concluido") return false;
      const diff = (today.getTime() - parseISODate(r.dateISO).getTime()) / 86400000;
      if (period === "today" && !(diff >= 0 && diff < 1)) return false;
      if (period === "week" && diff > 7) return false;
      if (period === "month" && diff > 30) return false;
      return true;
    });
  }, [rows, period]);

  const fuelTotal = useMemo(() => {
    const today = parseISODate(todayISO());
    return fuel.reduce((s, f) => {
      const diff = (today.getTime() - parseISODate(f.dateISO).getTime()) / 86400000;
      if (period === "today" && !(diff >= 0 && diff < 1)) return s;
      if (period === "week" && diff > 7) return s;
      if (period === "month" && diff > 30) return s;
      return s + f.total;
    }, 0);
  }, [fuel, period]);

  const totals = useMemo(() => {
    const revenue = filtered.reduce((s, r) => s + (r.revenue ?? 0), 0);
    const driverCost = filtered.reduce((s, r) => s + (r.driverPay ?? r.cost ?? 0), 0);
    const cost = driverCost + fuelTotal;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const deliveries = filtered.reduce((s, r) => s + r.totalDeliveries, 0);
    const km = filtered.reduce((s, r) => s + (r.km ?? 0), 0);
    return {
      revenue, cost, profit, margin, driverCost, fuelTotal,
      costPerKm: km > 0 ? cost / km : 0,
      costPerDelivery: deliveries > 0 ? cost / deliveries : 0,
      ticket: filtered.length > 0 ? revenue / filtered.length : 0,
    };
  }, [filtered, fuelTotal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="today">Hoje</option>
          <option value="week">Últimos 7 dias</option>
          <option value="month">Últimos 30 dias</option>
          <option value="all">Todo período</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Faturamento" value={brl(totals.revenue)} accent="success" />
        <MetricCard label="Custo total" value={brl(totals.cost)} accent="warning" />
        <MetricCard label="Lucro" value={brl(totals.profit)} accent={totals.profit >= 0 ? "success" : "destructive"} />
        <MetricCard label="Margem" value={pct(totals.margin)} accent="info" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Pagto motoristas" value={brl(totals.driverCost)} />
        <MetricCard label="Combustível" value={brl(totals.fuelTotal)} />
        <MetricCard label="Custo por entrega" value={brl(totals.costPerDelivery)} />
        <MetricCard label="Ticket médio" value={brl(totals.ticket)} />
      </div>

      <FinanceiroChart rows={rows} fuel={fuel} />

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
                <th className="pb-2 font-medium">Pagto motorista</th>
                <th className="pb-2 font-medium">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Sem rotas concluídas no período.</td></tr>
              )}
              {filtered.map((r) => {
                const profit = (r.revenue ?? 0) - (r.driverPay ?? 0);
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">{r.date}</td>
                    <td className="py-3">{r.driverName}</td>
                    <td className="py-3 font-mono text-xs">{r.code}</td>
                    <td className="py-3">{num(r.totalDeliveries)}</td>
                    <td className="py-3">{brl(r.revenue ?? 0)}</td>
                    <td className="py-3">{brl(r.driverPay ?? 0)}</td>
                    <td className="py-3 text-success">{brl(profit)}</td>
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

function FinanceiroChart({ rows, fuel }: { rows: ReturnType<typeof useDbAssignedRoutes>["rows"]; fuel: ReturnType<typeof useDbFuelEntries>["rows"] }) {
  const data = useMemo(() => {
    const today = parseISODate(todayISO());
    const days: { date: string; label: string; faturamento: number; custo: number; lucro: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      days.push({ date: iso, label, faturamento: 0, custo: 0, lucro: 0 });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    for (const r of rows) {
      if (r.status !== "concluido") continue;
      const e = map.get(r.dateISO);
      if (!e) continue;
      e.faturamento += r.revenue ?? 0;
      e.custo += r.driverPay ?? r.cost ?? 0;
    }
    for (const f of fuel) {
      const e = map.get(f.dateISO);
      if (!e) continue;
      e.custo += f.total ?? 0;
    }
    for (const d of days) d.lucro = d.faturamento - d.custo;
    return days;
  }, [rows, fuel]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Evolução dos últimos 30 dias</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$ ${v / 1000}k`} />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="custo" name="Custo" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
