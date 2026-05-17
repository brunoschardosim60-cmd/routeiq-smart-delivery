import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Box, CheckCircle2, Clock, AlertTriangle, Users, Route as RouteIcon,
  Gauge, Wallet, TrendingUp,
} from "lucide-react";
import { brl, num, today, todayISO, parseISODate } from "@/lib/format";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function pctDiff(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function AdminDashboard() {
  const { rows: all, isLoading } = useDbAssignedRoutes();

  const stats = useMemo(() => {
    const t = todayISO();
    const todayRows = all.filter((r) => r.dateISO === t);
    const concluded = all.filter((r) => r.status === "concluido");
    const inProgress = all.filter((r) => r.status === "em_andamento" || r.status === "atrasado");
    const problems = all.filter((r) => r.status === "problema" || r.status === "atrasado");
    const activeDrivers = new Set(inProgress.map((r) => r.driverId)).size;
    const kmToday = todayRows.reduce((s, r) => s + (r.km ?? 0), 0);
    const deliveriesToday = todayRows.reduce((s, r) => s + (r.totalDeliveries ?? 0), 0);
    const doneToday = todayRows.reduce((s, r) => s + (r.done ?? 0), 0);
    const pendingToday = Math.max(0, deliveriesToday - doneToday);
    const revenueTotal = concluded.reduce((s, r) => s + (r.revenue ?? 0), 0);
    const costTotal = concluded.reduce((s, r) => s + (r.cost ?? 0), 0);
    const profit = revenueTotal - costTotal;

    // Yesterday for trend
    const yesterday = new Date(parseISODate(t));
    yesterday.setDate(yesterday.getDate() - 1);
    const yISO = yesterday.toISOString().slice(0, 10);
    const yesterdayRows = all.filter((r) => r.dateISO === yISO);
    const yDeliv = yesterdayRows.reduce((s, r) => s + (r.totalDeliveries ?? 0), 0);
    const yDone = yesterdayRows.reduce((s, r) => s + (r.done ?? 0), 0);

    return {
      todayRows, concluded, inProgress, problems,
      activeDrivers, kmToday, deliveriesToday, doneToday, pendingToday,
      revenueTotal, costTotal, profit,
      trendDeliv: pctDiff(deliveriesToday, yDeliv),
      trendDone: pctDiff(doneToday, yDone),
    };
  }, [all]);

  const chartData = useMemo(() => {
    const base = parseISODate(todayISO());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      const dayRows = all.filter((r) => r.dateISO === iso);
      return {
        day: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        entregas: dayRows.reduce((s, r) => s + (r.done ?? 0), 0),
        faturamento: dayRows.filter((r) => r.status === "concluido").reduce((s, r) => s + (r.revenue ?? 0), 0),
      };
    });
  }, [all]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{today()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Entregas hoje" value={num(stats.deliveriesToday)} icon={<Box className="h-5 w-5" />} accent="info"
          loading={isLoading} trend={{ value: stats.trendDeliv, label: "vs ontem" }} />
        <MetricCard label="Concluídas hoje" value={num(stats.doneToday)} icon={<CheckCircle2 className="h-5 w-5" />} accent="success"
          loading={isLoading} trend={{ value: stats.trendDone, label: "vs ontem" }} />
        <MetricCard label="Pendentes" value={num(stats.pendingToday)} icon={<Clock className="h-5 w-5" />} accent="warning" loading={isLoading} />
        <MetricCard label="Problemas" value={num(stats.problems.length)} icon={<AlertTriangle className="h-5 w-5" />} accent="destructive" loading={isLoading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entregas últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="deliv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="entregas" stroke="var(--primary)" strokeWidth={2} fill="url(#deliv)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento diário (concluídas)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => brl(v)}
                  />
                  <Bar dataKey="faturamento" fill="var(--success)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Motoristas ativos" value={num(stats.activeDrivers)} icon={<Users className="h-5 w-5" />} loading={isLoading} />
        <MetricCard label="Rotas em andamento" value={num(stats.inProgress.length)} icon={<RouteIcon className="h-5 w-5" />} accent="info" loading={isLoading} />
        <MetricCard label="KM rodado hoje" value={`${num(stats.kmToday)} km`} icon={<Gauge className="h-5 w-5" />} loading={isLoading} />
        <MetricCard label="Rotas concluídas" value={num(stats.concluded.length)} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard label="Faturamento (concluídas)" value={brl(stats.revenueTotal)} icon={<Wallet className="h-5 w-5" />} accent="success" loading={isLoading} />
        <MetricCard label="Custos" value={brl(stats.costTotal)} icon={<TrendingUp className="h-5 w-5" />} accent="warning" loading={isLoading} />
        <MetricCard label="Lucro" value={brl(stats.profit)} icon={<TrendingUp className="h-5 w-5" />} accent={stats.profit >= 0 ? "success" : "destructive"} loading={isLoading} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rotas em andamento</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {stats.inProgress.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {isLoading ? "Carregando…" : "Nenhuma rota em andamento."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Motorista</th>
                  <th className="pb-2 font-medium">Rota</th>
                  <th className="pb-2 font-medium">Origem → Destino</th>
                  <th className="pb-2 font-medium">Progresso</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Saída</th>
                </tr>
              </thead>
              <tbody>
                {stats.inProgress.map((r) => {
                  const pct = r.totalDeliveries ? Math.min(100, (r.done / r.totalDeliveries) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 transition-colors hover:bg-accent/40">
                      <td className="py-3">{r.driverName}</td>
                      <td className="py-3 font-mono text-xs">{r.code}</td>
                      <td className="py-3 max-w-[280px] truncate">{r.origin}</td>
                      <td className="py-3 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[120px]">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-success" : "bg-primary")}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">{r.done}/{r.totalDeliveries}</span>
                        </div>
                      </td>
                      <td className="py-3"><StatusBadge status={r.status} /></td>
                      <td className="py-3">{r.departure || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Rotas finalizadas recentemente</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {stats.concluded.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma rota finalizada ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Motorista</th>
                  <th className="pb-2 font-medium">Rota</th>
                  <th className="pb-2 font-medium">Origem → Destino</th>
                  <th className="pb-2 font-medium">KM</th>
                  <th className="pb-2 font-medium">Entregas</th>
                  <th className="pb-2 font-medium">Ganho</th>
                </tr>
              </thead>
              <tbody>
                {stats.concluded.slice(0, 10).map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 transition-colors hover:bg-accent/40">
                    <td className="py-3">{r.date}</td>
                    <td className="py-3">{r.driverName}</td>
                    <td className="py-3 font-mono text-xs">{r.code}</td>
                    <td className="py-3 max-w-[260px] truncate">{r.origin}</td>
                    <td className="py-3">{num(r.km)} km</td>
                    <td className="py-3">{r.done}/{r.totalDeliveries}</td>
                    <td className="py-3 text-success">{brl(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
