import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Box, Wallet, Fuel, Gauge, TrendingUp, FileText, X, Download, Building2 } from "lucide-react";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useDbFuelEntries } from "@/lib/fuel-db";
import { useClientCompanies } from "@/lib/client-companies";
import { brl } from "@/lib/format";
import { toast } from "sonner";

type ReportId = "deliveries" | "costs" | "fuel" | "km" | "profit" | "clients";

const reports: { id: ReportId; icon: any; title: string; desc: string }[] = [
  { id: "deliveries", icon: Box, title: "Entregas / Rotas por período", desc: "Rotas atribuídas, entregas e KM no período." },
  { id: "costs", icon: Wallet, title: "Custos operacionais", desc: "Combustível + custos de rotas." },
  { id: "fuel", icon: Fuel, title: "Controle de combustível", desc: "Abastecimentos por veículo e motorista." },
  { id: "km", icon: Gauge, title: "Quilometragem por veículo", desc: "KM rodado por placa/motorista." },
  { id: "profit", icon: TrendingUp, title: "Lucro por rota", desc: "Receita − custo por rota." },
  { id: "clients", icon: Building2, title: "Faturamento por empresa cliente", desc: "Agrupa rotas concluídas por cliente." },
];

export const Route = createFileRoute("/admin/relatorios")({
  component: RelatoriosPage,
});

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [header.join(";"), ...rows.map((r) => r.map(csvEscape).join(";"))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}

function RelatoriosPage() {
  const [active, setActive] = useState<ReportId | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { rows: routes } = useDbAssignedRoutes();
  const { rows: fuel } = useDbFuelEntries();
  const { rows: clients } = useClientCompanies();

  const r = reports.find((x) => x.id === active);

  const inRange = (iso: string) => (!from || iso >= from) && (!to || iso <= to);
  const filteredRoutes = useMemo(() => routes.filter((r) => inRange(r.dateISO)), [routes, from, to]);
  const filteredFuel = useMemo(() => fuel.filter((r) => inRange(r.dateISO)), [fuel, from, to]);

  const preview = useMemo<{ header: string[]; rows: (string | number)[][] } | null>(() => {
    if (!active) return null;
    if (active === "deliveries") {
      return {
        header: ["Data", "Código", "Motorista", "Origem", "Entregas", "KM", "Status"],
        rows: filteredRoutes.slice(0, 10).map((r) => [r.date, r.code, r.driverName, r.origin, r.totalDeliveries, r.km, r.status]),
      };
    }
    if (active === "costs") {
      const fuelCost = filteredFuel.reduce((a, x) => a + x.total, 0);
      const routeCost = filteredRoutes.reduce((a, x) => a + x.cost, 0);
      return {
        header: ["Categoria", "Valor"],
        rows: [["Combustível", brl(fuelCost)], ["Custo de rotas", brl(routeCost)], ["TOTAL", brl(fuelCost + routeCost)]],
      };
    }
    if (active === "fuel") {
      return {
        header: ["Data", "Motorista", "Veículo", "Placa", "Litros", "R$/L", "Total"],
        rows: filteredFuel.slice(0, 10).map((r) => [r.date, r.driverName, r.vehicle ?? "—", r.plate ?? "—", r.liters, brl(r.pricePerL), brl(r.total)]),
      };
    }
    if (active === "km") {
      const map = new Map<string, number>();
      filteredRoutes.forEach((r) => map.set(r.driverName, (map.get(r.driverName) ?? 0) + r.km));
      return {
        header: ["Motorista", "KM total"],
        rows: Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, k]) => [n, `${k} km`]),
      };
    }
    if (active === "profit") {
      return {
        header: ["Data", "Código", "Motorista", "Receita", "Custo", "Lucro"],
        rows: filteredRoutes.slice(0, 10).map((r) => [r.date, r.code, r.driverName, brl(r.revenue), brl(r.cost), brl(r.revenue - r.cost)]),
      };
    }
    if (active === "clients") {
      const concluidas = filteredRoutes.filter((r) => r.status === "concluido");
      const map = new Map<string, { name: string; rotas: number; revenue: number; driverPay: number }>();
      for (const r of concluidas) {
        const key = r.clientCompanyId ?? "avulsa";
        const name = key === "avulsa" ? "Avulsas" : (clients.find((c) => c.id === key)?.name ?? "—");
        const acc = map.get(key) ?? { name, rotas: 0, revenue: 0, driverPay: 0 };
        acc.rotas += 1; acc.revenue += r.revenue; acc.driverPay += r.driverPay ?? 0;
        map.set(key, acc);
      }
      const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        header: ["Cliente", "Rotas", "Faturamento", "Pagto motoristas", "Margem"],
        rows: rows.slice(0, 10).map((r) => [r.name, r.rotas, brl(r.revenue), brl(r.driverPay), brl(r.revenue - r.driverPay)]),
      };
    }
    return null;
  }, [active, filteredRoutes, filteredFuel, clients]);

  const exportCsv = () => {
    if (!active) return;
    const period = `${from || "inicio"}_a_${to || "hoje"}`;
    if (active === "deliveries") {
      if (filteredRoutes.length === 0) return toast.warning("Sem rotas no período");
      downloadCsv(`rotas_${period}.csv`,
        ["Data","Código","Motorista","Origem","Entregas","KM","Saída","Retorno","Status"],
        filteredRoutes.map((r) => [r.date, r.code, r.driverName, r.origin, r.totalDeliveries, r.km, r.departure, r.expectedReturn, r.status]));
    } else if (active === "costs") {
      const fuelCost = filteredFuel.reduce((a, x) => a + x.total, 0);
      const routeCost = filteredRoutes.reduce((a, x) => a + x.cost, 0);
      downloadCsv(`custos_${period}.csv`,
        ["Categoria","Valor"],
        [["Combustível", fuelCost.toFixed(2)], ["Custo de rotas", routeCost.toFixed(2)], ["TOTAL", (fuelCost + routeCost).toFixed(2)]]);
    } else if (active === "fuel") {
      if (filteredFuel.length === 0) return toast.warning("Sem abastecimentos no período");
      downloadCsv(`combustivel_${period}.csv`,
        ["Data","Motorista","Veículo","Placa","Litros","R$/L","Total","Odômetro","Posto"],
        filteredFuel.map((r) => [r.date, r.driverName, r.vehicle, r.plate, r.liters, r.pricePerL.toFixed(2), r.total.toFixed(2), r.odometer, r.station ?? ""]));
    } else if (active === "km") {
      const map = new Map<string, { plate: string; driver: string; km: number }>();
      filteredRoutes.forEach((r) => {
        const k = `${r.driverName}`;
        const cur = map.get(k) ?? { plate: "—", driver: r.driverName, km: 0 };
        cur.km += r.km; map.set(k, cur);
      });
      const rows = Array.from(map.values()).sort((a, b) => b.km - a.km);
      if (rows.length === 0) return toast.warning("Sem dados no período");
      downloadCsv(`km_${period}.csv`, ["Motorista","KM total"], rows.map((r) => [r.driver, r.km]));
    } else if (active === "profit") {
      if (filteredRoutes.length === 0) return toast.warning("Sem rotas no período");
      downloadCsv(`lucro_${period}.csv`,
        ["Data","Código","Motorista","Receita","Custo","Lucro"],
        filteredRoutes.map((r) => [r.date, r.code, r.driverName, r.revenue.toFixed(2), r.cost.toFixed(2), (r.revenue - r.cost).toFixed(2)]));
    } else if (active === "clients") {
      const concluidas = filteredRoutes.filter((r) => r.status === "concluido");
      if (concluidas.length === 0) return toast.warning("Sem rotas concluídas no período");
      const map = new Map<string, { name: string; rotas: number; revenue: number; driverPay: number }>();
      for (const r of concluidas) {
        const key = r.clientCompanyId ?? "avulsa";
        const name = key === "avulsa" ? "Avulsas" : (clients.find((c) => c.id === key)?.name ?? "—");
        const acc = map.get(key) ?? { name, rotas: 0, revenue: 0, driverPay: 0 };
        acc.rotas += 1; acc.revenue += r.revenue; acc.driverPay += r.driverPay ?? 0;
        map.set(key, acc);
      }
      const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      downloadCsv(`clientes_${period}.csv`,
        ["Cliente","Rotas","Faturamento","Pagto motoristas","Margem"],
        rows.map((r) => [r.name, r.rotas, r.revenue.toFixed(2), r.driverPay.toFixed(2), (r.revenue - r.driverPay).toFixed(2)]));
    }
    toast.success("CSV gerado");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((rp) => {
          const Icon = rp.icon;
          return (
            <Card key={rp.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActive(rp.id)}>
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{rp.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{rp.desc}</p>
                <button className="mt-4 text-sm font-medium text-primary hover:underline">Gerar CSV →</button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {r && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl border-l border-border bg-card shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h3 className="text-lg font-semibold">{r.title}</h3>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
            <button onClick={() => setActive(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">De</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Até</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-3"><FileText className="h-4 w-4" /> Resumo</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{filteredRoutes.length} rota(s) no período</p>
                <p>{filteredFuel.length} abastecimento(s) — {brl(filteredFuel.reduce((a, x) => a + x.total, 0))}</p>
              </div>
            </div>

            {preview && preview.rows.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                  Preview (primeiras {preview.rows.length} linha{preview.rows.length > 1 ? "s" : ""})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/20">
                      <tr>{preview.header.map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, i) => (
                        <tr key={i} className="border-t border-border/60">
                          {row.map((cell, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{String(cell)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {preview && preview.rows.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Sem dados no período selecionado.
              </p>
            )}

            <button onClick={exportCsv} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
