import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { driverMonthlyEarnings, routesData, meDriver } from "@/lib/mock-data";
import { brl } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/motorista/financeiro")({
  component: () => {
    const my = routesData.filter((r) => r.driverId === meDriver.id).concat(routesData.slice(0, 5));
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Meu Financeiro</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Ganho bruto do mês" value={brl(0)} accent="success" />
          <MetricCard label="Descontos / custos" value={brl(0)} accent="warning" />
          <MetricCard label="Ganho líquido estimado" value={brl(0)} accent="success" />
          <MetricCard label="Comissão acumulada" value={brl(0)} accent="info" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Ganho por semana — mês atual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={driverMonthlyEarnings}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                <Bar dataKey="ganho" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detalhamento por rota</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Entregas</th>
                  <th className="pb-2 font-medium">KM</th>
                  <th className="pb-2 font-medium">Bruto</th>
                  <th className="pb-2 font-medium">Combustível</th>
                  <th className="pb-2 font-medium">Comissão</th>
                  <th className="pb-2 font-medium">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {my.slice(0, 10).map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">{r.date}</td>
                    <td className="py-3">{r.totalDeliveries}</td>
                    <td className="py-3">{r.km} km</td>
                    <td className="py-3">{brl(r.revenue)}</td>
                    <td className="py-3 text-muted-foreground">{brl(r.cost * 0.45)}</td>
                    <td className="py-3 text-muted-foreground">{brl(r.revenue * 0.18)}</td>
                    <td className="py-3 text-success">{brl(r.revenue - r.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground italic">
          Valores estimados. O financeiro oficial é definido pela transportadora.
        </p>
      </div>
    );
  },
});
