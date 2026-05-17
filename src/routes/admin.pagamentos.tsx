import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { brl, num, parseISODate, todayISO } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/admin/pagamentos")({
  component: PagamentosPage,
});

function PagamentosPage() {
  const { rows, isLoading } = useDbAssignedRoutes();
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

  const totals = useMemo(() => {
    const diaria = filtered.filter((r) => r.tripType !== "segunda");
    const segunda = filtered.filter((r) => r.tripType === "segunda");
    return {
      qtd: filtered.length,
      saidas2: segunda.length,
      payDaily: diaria.reduce((s, r) => s + (r.driverPay ?? 0), 0),
      payExtra: segunda.reduce((s, r) => s + (r.driverPay ?? 0), 0),
      total: filtered.reduce((s, r) => s + (r.driverPay ?? 0), 0),
      revenue: filtered.reduce((s, r) => s + (r.revenue ?? 0), 0),
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagamentos por Rota</h1>
          <p className="text-sm text-muted-foreground">Diária + 2ª saída calculados automaticamente no fechamento da rota</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="today">Hoje</option>
          <option value="week">Últimos 7 dias</option>
          <option value="month">Últimos 30 dias</option>
          <option value="all">Todo período</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Rotas concluídas" value={num(totals.qtd)} />
        <MetricCard label="2ª saídas" value={num(totals.saidas2)} accent="info" />
        <MetricCard label="Faturamento" value={brl(totals.revenue)} accent="success" />
        <MetricCard label="Total a pagar motoristas" value={brl(totals.total)} accent="warning" />
      </div>

      <PagamentosChart rows={filtered} />

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhe por rota</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Saída</th>
                <th className="pb-2 font-medium">Motorista</th>
                <th className="pb-2 font-medium">Rota</th>
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium">Faturamento</th>
                <th className="pb-2 font-medium">Pagto motorista</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">
                  {isLoading ? "Carregando…" : "Sem rotas concluídas no período."}
                </td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">{r.date}</td>
                  <td className="py-3 font-mono text-xs">{r.departure || "—"}</td>
                  <td className="py-3">{r.driverName}</td>
                  <td className="py-3 font-mono text-xs">{r.code}</td>
                  <td className="py-3">
                    {r.tripType === "segunda"
                      ? <span className="rounded-full bg-info/15 text-info border border-info/30 px-2 py-0.5 text-[10px] font-medium">2ª saída</span>
                      : r.tripType === "avulsa"
                        ? <span className="rounded-full bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 text-[10px] font-medium">Avulsa</span>
                        : <span className="rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium">Diária</span>}
                  </td>
                  <td className="py-3">{brl(r.revenue ?? 0)}</td>
                  <td className="py-3 font-semibold text-success">{brl(r.driverPay ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        A 1ª rota concluída do dia paga diária; rotas adicionais entram como 2ª saída. Rotas avulsas usam valores definidos na criação.
      </p>
    </div>
  );
}

function PagamentosChart({ rows }: { rows: ReturnType<typeof useDbAssignedRoutes>["rows"] }) {
  const data = useMemo(() => {
    const map = new Map<string, { driver: string; diaria: number; segunda: number }>();
    for (const r of rows) {
      const e = map.get(r.driverName) ?? { driver: r.driverName, diaria: 0, segunda: 0 };
      if (r.tripType === "segunda") e.segunda += r.driverPay ?? 0;
      else e.diaria += r.driverPay ?? 0;
      map.set(r.driverName, e);
    }
    return Array.from(map.values()).sort((a, b) => (b.diaria + b.segunda) - (a.diaria + a.segunda)).slice(0, 10);
  }, [rows]);

  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pagamentos por motorista (período)</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="driver" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="diaria" name="Diária" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="segunda" name="2ª saída" stackId="a" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
