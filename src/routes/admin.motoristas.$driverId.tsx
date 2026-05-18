import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { drivers, routesData } from "@/lib/mock-data";
import { ArrowLeft, Truck, Pencil } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { brl, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/motoristas/$driverId")({
  component: DriverProfile,
});

function DriverProfile() {
  const { driverId } = Route.useParams();
  const base = drivers.find((x) => x.id === driverId) ?? drivers[0];

  const [dailyRate, setDailyRate] = useState(base.dailyRate);
  const [secondTripRate, setSecondTripRate] = useState(base.secondTripRate);
  const [monthlyTarget, setMonthlyTarget] = useState(base.monthlyTarget);
  const [company, setCompany] = useState(base.company);

  const myRoutes = routesData.filter((r) => r.driverId === base.id).slice(0, 6);
  const secondTripsThisMonth = routesData.filter((r) => r.driverId === base.id && r.isSecondTrip).length;

  const monthly = ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai"].map((m, i) => ({
    mes: m, entregas: 320 + ((i * 47) % 220),
  }));
  const weeklyKm = ["S1", "S2", "S3", "S4", "S5", "S6"].map((w, i) => ({
    week: w, km: 380 + (i * 27) % 220,
  }));

  const daysInMonth = 31;
  const worked = new Set([1,2,3,5,6,7,8,9,10,12,13,14,15,16,17,19,20,21,22,23]);

  const save = () => {
    toast.success("Valores atualizados", {
      description: `${base.name}: diária ${brl(dailyRate)}, 2ª saída ${brl(secondTripRate)}, meta ${monthlyTarget}.`,
    });
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/motoristas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
            {base.initials}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{base.name}</h1>
              <span className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium border",
                company === "DBM"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-success/10 text-success border-success/30",
              )}>
                {company === "BS" ? "BS Soluções" : "DBM"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">CPF {base.cpf} · CNH {base.cnh}</p>
            <p className="text-xs text-muted-foreground">Admitido em {base.admissionDate}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={base.status} />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Truck className="h-3.5 w-3.5" /> {base.vehicle} · {base.plate}
              {company === "DBM" && <span className="text-info">(rotativo)</span>}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Remuneração e meta</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                <Pencil className="h-3.5 w-3.5" /> Editar valores
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar valores · {base.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value as typeof company)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="DBM">DBM (motoristas trocam de veículo)</option>
                    <option value="BS">BS Soluções (motorista fixo no veículo)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Diária base (R$)</label>
                  <input type="number" value={dailyRate} onChange={(e) => setDailyRate(+e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <p className="mt-1 text-[11px] text-muted-foreground">Pago por dia de trabalho do motorista.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Valor de 2ª saída (R$)</label>
                  <input type="number" value={secondTripRate} onChange={(e) => setSecondTripRate(+e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Aplicado quando o motorista termina uma rota e faz outra entrega no mesmo dia (em horário diferente).
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Meta mensal (entregas)</label>
                  <input type="number" value={monthlyTarget} onChange={(e) => setMonthlyTarget(+e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">Cancelar</button>
                </DialogClose>
                <DialogClose asChild>
                  <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Salvar
                  </button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Diária base" value={brl(dailyRate)} accent="success" />
            <MetricCard label="2ª saída" value={brl(secondTripRate)} accent="info" />
            <MetricCard label="Meta mensal" value={`${monthlyTarget} entregas`} />
            <MetricCard label="2ªs saídas no mês" value={String(secondTripsThisMonth)} accent="warning" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total de entregas" value={num(base.totalDeliveries)} />
        <MetricCard label="Dias trabalhados" value={num(base.totalDays)} />
        <MetricCard label="KM total rodado" value={`${num(base.totalKm)} km`} />
        <MetricCard label="Média KM/L" value={`${base.avgKmL} km/L`} accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Entregas por mês — últimos 6 meses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="entregas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">KM rodado por semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyKm}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="km" stroke="var(--color-success)" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Calendário do mês — Maio/2025</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {["D","S","T","Q","Q","S","S"].map((d, i) => (
              <div key={i} className="py-1 font-medium text-muted-foreground">{d}</div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isWorked = worked.has(day);
              return (
                <div
                  key={day}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-md border text-xs",
                    isWorked
                      ? "bg-success/20 border-success/40 text-success font-semibold"
                      : "bg-muted/30 border-border text-muted-foreground",
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de rotas recentes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Origem</th>
                <th className="pb-2 font-medium">Destino</th>
                <th className="pb-2 font-medium">Entregas</th>
                <th className="pb-2 font-medium">KM</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {myRoutes.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">{r.date}</td>
                  <td className="py-3">{r.origin}</td>
                  <td className="py-3 text-muted-foreground">Zona Sul / Centro</td>
                  <td className="py-3">{r.totalDeliveries}</td>
                  <td className="py-3">{r.km} km</td>
                  <td className="py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
