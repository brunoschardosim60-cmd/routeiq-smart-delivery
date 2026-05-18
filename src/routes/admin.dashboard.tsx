import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Box, CheckCircle2, Clock, AlertTriangle, Users, Route as RouteIcon,
  Gauge, Timer, RefreshCw, AlertCircle, Fuel,
} from "lucide-react";
import { ComproveiAlertsCard } from "@/components/ComproveiAlertsCard";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { last7Deliveries, last7Revenue, routesData, alerts, ranking } from "@/lib/mock-data";
import { brl, num, today } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const inProgress = routesData.filter((r) => r.status !== "concluido").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{today()}</p>
        </div>
      </div>


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total de entregas hoje" value="0" icon={<Box className="h-5 w-5" />} accent="info" />
        <MetricCard label="Entregas concluídas" value="0" icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <MetricCard label="Pendentes" value="0" icon={<Clock className="h-5 w-5" />} accent="warning" />
        <MetricCard label="Problemas" value="0" icon={<AlertTriangle className="h-5 w-5" />} accent="destructive" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Motoristas ativos" value="0" icon={<Users className="h-5 w-5" />} />
        <MetricCard label="Rotas em andamento" value="0" icon={<RouteIcon className="h-5 w-5" />} accent="info" />
        <MetricCard label="KM rodado hoje" value="0 km" icon={<Gauge className="h-5 w-5" />} />
        <MetricCard label="Tempo médio por rota" value="—" icon={<Timer className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Entregas concluídas — últimos 7 dias</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={last7Deliveries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="entregas" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento diário — últimos 7 dias</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={last7Revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => brl(v)}
                />
                <Bar dataKey="faturamento" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rotas em andamento</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Motorista</th>
                <th className="pb-2 font-medium">Rota</th>
                <th className="pb-2 font-medium">Entregas</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Saída</th>
                <th className="pb-2 font-medium">Previsão retorno</th>
              </tr>
            </thead>
            <tbody>
              {inProgress.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">{r.driverName}</td>
                  <td className="py-3 font-mono text-xs">{r.code}</td>
                  <td className="py-3">{r.done}/{r.totalDeliveries}</td>
                  <td className="py-3"><StatusBadge status={r.status} /></td>
                  <td className="py-3">{r.departure}</td>
                  <td className="py-3">{r.expectedReturn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Alertas operacionais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((a, i) => {
              const Icon = a.type === "atraso" ? Clock : a.type === "problema" ? AlertCircle : Fuel;
              const accent = a.type === "atraso" ? "warning" : a.type === "problema" ? "destructive" : "warning";
              return (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                    accent === "destructive" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.driver}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <ComproveiAlertsCard />

        <Card>
          <CardHeader><CardTitle className="text-base">Ranking de produtividade — Top 5</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {ranking.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="w-5 text-sm font-semibold text-muted-foreground">{i + 1}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {d.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <span className="text-xs text-muted-foreground">{num(d.done)} entregas · {d.pct}%</span>
                  </div>
                  <Progress value={d.pct} className="mt-1.5 h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
