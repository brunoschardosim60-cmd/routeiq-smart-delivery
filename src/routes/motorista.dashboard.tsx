import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { brl, num, today, todayISO, parseISODate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { Box, Gauge, Clock, Wallet, Calendar, TrendingUp, Truck, MapPin } from "lucide-react";
import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/motorista/dashboard")({
  component: DriverDashboard,
});

function DriverDashboard() {
  const { user } = useAuth();
  const { rows: all, isLoading } = useDbAssignedRoutes();
  const firstName = (user?.full_name?.trim().split(" ")[0]) || "Motorista";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const stats = useMemo(() => {
    const mine = all.filter((r) => r.driverId === user?.id);
    const t = todayISO();
    const todayRows = mine.filter((r) => r.dateISO === t);
    const concluded = mine.filter((r) => r.status === "concluido");
    const inProgress = mine.filter((r) => r.status === "em_andamento" || r.status === "atrasado");
    const month = t.slice(0, 7);
    const monthRows = mine.filter((r) => r.dateISO.startsWith(month));
    const monthConcluded = monthRows.filter((r) => r.status === "concluido");

    return {
      todayDeliveries: todayRows.reduce((s, r) => s + r.totalDeliveries, 0),
      todayDone: todayRows.reduce((s, r) => s + r.done, 0),
      todayKm: todayRows.reduce((s, r) => s + r.km, 0),
      todayRevenue: todayRows.filter((r) => r.status === "concluido").reduce((s, r) => s + (r.driverPay ?? 0), 0),
      monthDays: new Set(monthConcluded.map((r) => r.dateISO)).size,
      monthDeliveries: monthRows.reduce((s, r) => s + r.totalDeliveries, 0),
      monthKm: monthRows.reduce((s, r) => s + r.km, 0),
      monthRevenue: monthConcluded.reduce((s, r) => s + (r.driverPay ?? 0), 0),
      inProgress,
      recent: concluded.slice(0, 5),
    };
  }, [all, user?.id]);

  const weeklyChart = useMemo(() => {
    const base = parseISODate(todayISO());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      const mine = all.filter((r) => r.driverId === user?.id && r.dateISO === iso && r.status === "concluido");
      return {
        day: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        ganho: mine.reduce((s, r) => s + (r.driverPay ?? 0), 0),
      };
    });
  }, [all, user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}, {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground capitalize">{today()}</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hoje</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Entregas" value={`${num(stats.todayDone)} / ${num(stats.todayDeliveries)}`} icon={<Box className="h-5 w-5" />} accent="info" />
          <MetricCard label="KM rodados" value={`${num(stats.todayKm)} km`} icon={<Gauge className="h-5 w-5" />} />
          <MetricCard label="Rotas em andamento" value={num(stats.inProgress.length)} icon={<Clock className="h-5 w-5" />} accent="warning" />
          <MetricCard label="Ganho do dia" value={brl(stats.todayRevenue)} icon={<Wallet className="h-5 w-5" />} accent="success" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mês</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Dias trabalhados" value={num(stats.monthDays)} icon={<Calendar className="h-5 w-5" />} />
          <MetricCard label="Total de entregas" value={num(stats.monthDeliveries)} icon={<Box className="h-5 w-5" />} accent="info" />
          <MetricCard label="KM total" value={`${num(stats.monthKm)} km`} icon={<Truck className="h-5 w-5" />} />
          <MetricCard label="Ganho do mês" value={brl(stats.monthRevenue)} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ganhos dos últimos 7 dias</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => brl(v)}
                />
                <Bar dataKey="ganho" fill="var(--success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Rotas em andamento</span>
            <Link to="/motorista/rotas" className="text-xs font-normal text-primary hover:underline">Ver todas</Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.inProgress.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {isLoading ? "Carregando…" : "Nenhuma rota em andamento."}
            </p>
          ) : (
            stats.inProgress.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{r.origin}</p>
                  <p className="text-xs text-muted-foreground">{r.date} · saída {r.departure || "—"} · {r.totalDeliveries} entregas</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas rotas finalizadas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stats.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma rota finalizada ainda.</p>
          ) : (
            stats.recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{r.origin}</p>
                  <p className="text-xs text-muted-foreground">{r.date} · {num(r.km)} km · {r.done} entregas</p>
                </div>
                <p className="text-sm font-semibold text-success">{brl(r.driverPay ?? 0)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
