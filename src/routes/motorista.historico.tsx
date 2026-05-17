import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useAuth } from "@/hooks/use-auth";
import { brl, num } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/motorista/historico")({
  component: HistoricoPage,
});

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function HistoricoPage() {
  const { user } = useAuth();
  const { rows } = useDbAssignedRoutes();
  const now = new Date();
  const [m, setM] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const mine = useMemo(
    () => rows.filter((r) => r.driverId === user?.id && r.status === "concluido"),
    [rows, user?.id],
  );

  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const firstWeekday = new Date(year, m, 1).getDay();
  const today = now.getFullYear() === year && now.getMonth() === m ? now.getDate() : -1;

  const dayInfo = useMemo(() => {
    const monthPrefix = `${year}-${String(m + 1).padStart(2, "0")}`;
    const map: Record<number, { entregas: number; km: number; ganho: number }> = {};
    for (const r of mine) {
      if (!r.dateISO.startsWith(monthPrefix)) continue;
      const day = parseInt(r.dateISO.slice(8, 10), 10);
      const acc = map[day] ?? { entregas: 0, km: 0, ganho: 0 };
      acc.entregas += r.done;
      acc.km += r.km;
      acc.ganho += r.driverPay ?? 0;
      map[day] = acc;
    }
    return map;
  }, [mine, m, year]);

  const yearStats = useMemo(() => {
    const yearRows = mine.filter((r) => r.dateISO.startsWith(`${year}-`));
    return {
      dias: new Set(yearRows.map((r) => r.dateISO)).size,
      entregas: yearRows.reduce((s, r) => s + r.done, 0),
      km: yearRows.reduce((s, r) => s + r.km, 0),
      ganho: yearRows.reduce((s, r) => s + (r.driverPay ?? 0), 0),
    };
  }, [mine, year]);

  const monthlyTable = useMemo(() => {
    const map = new Map<string, { dias: Set<string>; entregas: number; km: number; ganho: number }>();
    for (const r of mine) {
      if (!r.dateISO.startsWith(`${year}-`)) continue;
      const key = r.dateISO.slice(0, 7);
      const acc = map.get(key) ?? { dias: new Set(), entregas: 0, km: 0, ganho: 0 };
      acc.dias.add(r.dateISO);
      acc.entregas += r.done;
      acc.km += r.km;
      acc.ganho += r.driverPay ?? 0;
      map.set(key, acc);
    }
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([k, v]) => ({
      mes: MONTHS[parseInt(k.slice(5, 7), 10) - 1],
      dias: v.dias.size,
      entregas: v.entregas,
      km: v.km,
      ganho: v.ganho,
    }));
  }, [mine, year]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Meu Histórico</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Dias trabalhados (ano)" value={String(yearStats.dias)} />
        <MetricCard label="Total de entregas" value={num(yearStats.entregas)} accent="info" />
        <MetricCard label="KM total do ano" value={`${num(yearStats.km)} km`} />
        <MetricCard label="Ganho do ano" value={brl(yearStats.ganho)} accent="success" />
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
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm" />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumo mensal · {year}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Mês</th>
                <th className="pb-2 font-medium">Dias</th>
                <th className="pb-2 font-medium">Entregas</th>
                <th className="pb-2 font-medium">KM</th>
                <th className="pb-2 font-medium">Ganho</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTable.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Nenhuma rota concluída neste ano.</td></tr>
              )}
              {monthlyTable.map((row) => (
                <tr key={row.mes} className="border-b border-border/60">
                  <td className="py-3">{row.mes}</td>
                  <td className="py-3">{row.dias}</td>
                  <td className="py-3">{num(row.entregas)}</td>
                  <td className="py-3">{num(row.km)} km</td>
                  <td className="py-3 text-success">{brl(row.ganho)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
