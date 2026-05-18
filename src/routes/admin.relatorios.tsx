import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Box, Wallet, Fuel, Gauge, TrendingUp, FileText, X, Download } from "lucide-react";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useDbFuelEntries } from "@/lib/fuel-db";
import { brl } from "@/lib/format";
import { toast } from "sonner";

type ReportId = "deliveries" | "costs" | "fuel" | "km" | "profit";

const reports: { id: ReportId; icon: any; title: string; desc: string }[] = [
  { id: "deliveries", icon: Box, title: "Entregas / Rotas por período", desc: "Rotas atribuídas, entregas e KM no período." },
  { id: "costs", icon: Wallet, title: "Custos operacionais", desc: "Combustível + custos de rotas." },
  { id: "fuel", icon: Fuel, title: "Controle de combustível", desc: "Abastecimentos por veículo e motorista." },
  { id: "km", icon: Gauge, title: "Quilometragem por veículo", desc: "KM rodado por placa/motorista." },
  { id: "profit", icon: TrendingUp, title: "Lucro por rota", desc: "Receita − custo por rota." },
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

  const r = reports.find((x) => x.id === active);

  const inRange = (iso: string) => (!from || iso >= from) && (!to || iso <= to);
  const filteredRoutes = useMemo(() => routes.filter((r) => inRange(r.dateISO)), [routes, from, to]);
  const filteredFuel = useMemo(() => fuel.filter((r) => inRange(r.dateISO)), [fuel, from, to]);

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

            <button onClick={exportCsv} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
