import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { driverMonthlyTable, top10Months } from "@/lib/mock-data";
import { brl, num } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/motorista/historico")({
  component: HistoricoPage,
});

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function HistoricoPage() {
  const now = new Date();
  const [m, setM] = useState(now.getFullYear() === 2026 ? now.getMonth() : 0);
  const year = 2026;
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const firstWeekday = new Date(year, m, 1).getDay(); // 0=Dom..6=Sáb
  const today = now.getFullYear() === year && now.getMonth() === m ? now.getDate() : -1;
  const dayInfo: Record<number, { entregas: number; km: number; ganho: number }> = {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Meu Histórico</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Dias trabalhados (ano)" value="0" />
        <MetricCard label="Total de entregas" value={num(0)} accent="info" />
        <MetricCard label="KM total do ano" value="0 km" />
        <MetricCard label="Ganho estimado" value={brl(0)} accent="success" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Calendário · {MONTHS[m]} {year}</CardTitle>
            <div className="flex items-center gap-2">
              <button onClick={() => setM(Math.max(0, m - 1))} className="rounded-md border border-border p-1.5 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
              <select value={m} onChange={(e) => setM(Number(e.target.value))} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                {MONTHS.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
              </select>
              <span className="rounded-md border border-input bg-muted px-2 py-1 text-sm">2026</span>
              <button onClick={() => setM(Math.min(11, m + 1))} className="rounded-md border border-border p-1.5 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {["D","S","T","Q","Q","S","S"].map((d, i) => (
              <div key={i} className="py-1 font-medium text-muted-foreground">{d}</div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`blank-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today;
              const info = dayInfo[day];
              const isWorked = !!info;
              return (
                <div
                  key={day}
                  title={info ? `${info.entregas} entregas · ${info.km} km · ${brl(info.ganho)}` : ""}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-md border text-xs cursor-default transition-transform hover:scale-105",
                    isToday
                      ? "bg-primary border-primary text-primary-foreground font-bold"
                      : isWorked
                        ? "bg-success/20 border-success/40 text-success font-semibold"
                        : "bg-muted/30 border-border text-muted-foreground",
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success/20 border border-success/40" /> Trabalhou</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted/30 border border-border" /> Não trabalhou</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary" /> Hoje</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 meses com mais entregas</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={top10Months} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis type="category" dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} width={70} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Bar dataKey="entregas" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumo mensal</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Mês</th>
                <th className="pb-2 font-medium">Dias</th>
                <th className="pb-2 font-medium">Entregas</th>
                <th className="pb-2 font-medium">KM</th>
                <th className="pb-2 font-medium">Ganho estimado</th>
              </tr>
            </thead>
            <tbody>
              {driverMonthlyTable.map((row) => (
                <tr key={row.mes} className="border-b border-border/60">
                  <td className="py-3">{row.mes}</td>
                  <td className="py-3">{row.dias}</td>
                  <td className="py-3">{num(row.entregas)}</td>
                  <td className="py-3">{num(row.km)} km</td>
                  <td className="py-3 text-success">{brl(row.ganho)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="pt-3">Total</td>
                <td className="pt-3">{driverMonthlyTable.reduce((a,b) => a+b.dias, 0)}</td>
                <td className="pt-3">{num(driverMonthlyTable.reduce((a,b) => a+b.entregas, 0))}</td>
                <td className="pt-3">{num(driverMonthlyTable.reduce((a,b) => a+b.km, 0))} km</td>
                <td className="pt-3 text-success">{brl(driverMonthlyTable.reduce((a,b) => a+b.ganho, 0))}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
