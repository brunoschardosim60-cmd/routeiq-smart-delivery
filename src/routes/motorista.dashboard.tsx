import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { driverWeekly, sampleStops } from "@/lib/mock-data";
import { brl, num, today } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Box, Gauge, Clock, Wallet, Calendar, TrendingUp, Truck } from "lucide-react";

export const Route = createFileRoute("/motorista/dashboard")({
  component: DriverDashboard,
});

function DriverDashboard() {
  const { user } = useAuth();
  const firstName = (user?.full_name?.trim().split(" ")[0]) || "Motorista";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const meta = 0, feitas = 0;
  const pctMeta = meta > 0 ? (feitas / meta) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}, {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground capitalize">{today()}</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hoje</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Entregas realizadas" value="0 / 0" icon={<Box className="h-5 w-5" />} accent="info" />
          <MetricCard label="KM rodados" value="0 km" icon={<Gauge className="h-5 w-5" />} />
          <MetricCard label="Tempo em rota" value="—" icon={<Clock className="h-5 w-5" />} accent="warning" />
          <MetricCard label="Ganho estimado" value={brl(0)} icon={<Wallet className="h-5 w-5" />} accent="success" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mês</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Dias trabalhados" value="0" icon={<Calendar className="h-5 w-5" />} />
          <MetricCard label="Total de entregas" value={num(0)} icon={<Box className="h-5 w-5" />} accent="info" />
          <MetricCard label="KM total" value="0 km" icon={<Truck className="h-5 w-5" />} />
          <MetricCard label="Ganho estimado" value={brl(0)} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Entregas por dia — semana atual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={driverWeekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="entregas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Meta mensal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{num(feitas)}</p>
                <p className="text-xs text-muted-foreground">de {num(meta)} entregas</p>
              </div>
              <p className="text-2xl font-semibold text-success">{pctMeta.toFixed(1)}%</p>
            </div>
            <Progress value={pctMeta} className="h-3" />
            <p className="text-xs text-muted-foreground">Faltam {meta - feitas} entregas para bater a meta.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas entregas do dia</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {sampleStops.slice(0, 5).map((s) => (
            <div key={s.seq} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{s.client}</p>
                <p className="text-xs text-muted-foreground">{s.address}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{s.done ?? s.scheduled}</p>
                <div className="mt-1"><StatusBadge status={s.status} /></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
