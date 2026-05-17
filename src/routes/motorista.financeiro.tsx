import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useAuth } from "@/hooks/use-auth";
import { brl, num, todayISO } from "@/lib/format";

export const Route = createFileRoute("/motorista/financeiro")({
  component: FinanceiroMotoristaPage,
});

function FinanceiroMotoristaPage() {
  const { user } = useAuth();
  const { rows } = useDbAssignedRoutes();
  const [month, setMonth] = useState(todayISO().slice(0, 7));

  const mine = useMemo(
    () => rows.filter((r) => r.driverId === user?.id && r.status === "concluido"),
    [rows, user?.id],
  );
  const monthRows = useMemo(() => mine.filter((r) => r.dateISO.startsWith(month)), [mine, month]);

  const totals = useMemo(() => {
    const gross = monthRows.reduce((s, r) => s + (r.driverPay ?? 0), 0);
    const segundas = monthRows.filter((r) => r.tripType === "segunda").length;
    const diarias = monthRows.length - segundas;
    return {
      gross,
      diarias,
      segundas,
      entregas: monthRows.reduce((s, r) => s + r.done, 0),
      km: monthRows.reduce((s, r) => s + r.km, 0),
    };
  }, [monthRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Meu Financeiro</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Ganho do mês" value={brl(totals.gross)} accent="success" />
        <MetricCard label="Diárias" value={String(totals.diarias)} />
        <MetricCard label="2ª saídas" value={String(totals.segundas)} accent="info" />
        <MetricCard label="Entregas" value={num(totals.entregas)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento por rota</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Rota</th>
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium">Entregas</th>
                <th className="pb-2 font-medium">KM</th>
                <th className="pb-2 font-medium">Ganho</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Sem rotas concluídas neste mês.</td></tr>
              )}
              {monthRows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">{r.date}</td>
                  <td className="py-3 font-mono text-xs">{r.code}</td>
                  <td className="py-3">
                    {r.tripType === "segunda" ? "2ª saída" : r.tripType === "avulsa" ? "Avulsa" : "Diária"}
                  </td>
                  <td className="py-3">{r.done}</td>
                  <td className="py-3">{num(r.km)} km</td>
                  <td className="py-3 font-semibold text-success">{brl(r.driverPay ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
