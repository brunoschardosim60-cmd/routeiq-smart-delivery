import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { brl, num, todayISO, parseISODate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, X, Trash2 } from "lucide-react";
import { useDbFuelEntries, useCreateFuelEntry, useDeleteFuelEntry } from "@/lib/fuel-db";
import { useCompanyDrivers } from "@/lib/company-members";
import { useAuth } from "@/hooks/use-auth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";


export const Route = createFileRoute("/admin/combustivel")({
  component: CombustivelPage,
});

function CombustivelPage() {
  const { user } = useAuth();
  const drivers = useCompanyDrivers();
  const { rows } = useDbFuelEntries();
  const createMut = useCreateFuelEntry();
  const delMut = useDeleteFuelEntry();

  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState<string>(""); // raw uuid
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [liters, setLiters] = useState("");
  const [ppl, setPpl] = useState("");
  const [odometer, setOdometer] = useState("");
  const [station, setStation] = useState("");
  const [notes, setNotes] = useState("");
  const total = (Number(liters || 0) * Number(ppl || 0)).toFixed(2);

  const driverOptions = useMemo(() => {
    const opts = drivers.map((d) => ({ id: d.id.replace(/^auth-/, ""), name: d.name }));
    if (user?.id && !opts.find((o) => o.id === user.id)) {
      opts.unshift({ id: user.id, name: (user.full_name?.trim() || "Eu (admin)") });
    }
    return opts;
  }, [drivers, user?.id, user?.full_name]);

  const totalMonth = rows.reduce((a, r) => a + r.total, 0);
  const litersMonth = rows.reduce((a, r) => a + r.liters, 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const litersN = Number(liters);
    const pplN = Number(ppl);
    if (!litersN || !pplN) { toast.error("Preencha litros e R$/L"); return; }
    const drv = driverOptions.find((d) => d.id === driverId) ?? driverOptions[0];
    if (!drv) { toast.error("Cadastre um motorista primeiro"); return; }
    try {
      await createMut.mutateAsync({
        driverId: drv.id,
        driverName: drv.name,
        dateISO: date,
        vehicle: vehicle || null,
        plate: plate || null,
        liters: litersN,
        pricePerL: pplN,
        odometer: Number(odometer || 0),
        station: station || null,
        notes: notes || null,
      });
      toast.success("Abastecimento registrado", { description: `${litersN} L · ${brl(litersN * pplN)}` });
      setLiters(""); setPpl(""); setOdometer(""); setStation(""); setNotes(""); setVehicle(""); setPlate("");
      setOpen(false);
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err?.message ?? String(err) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Combustível</h1>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Registrar abastecimento
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Abastecimentos" value={String(rows.length)} />
        <MetricCard label="Custo total" value={brl(totalMonth)} accent="warning" />
        <MetricCard label="Litros" value={`${litersMonth} L`} accent="success" />
        <MetricCard label="Motoristas" value={String(driverOptions.length)} />
      </div>

      <FuelChart rows={rows} />

      <Card>
        <CardHeader><CardTitle className="text-base">Abastecimentos</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Motorista</th>
                <th className="pb-2 font-medium">Veículo</th>
                <th className="pb-2 font-medium">Placa</th>
                <th className="pb-2 font-medium">Litros</th>
                <th className="pb-2 font-medium">R$/L</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Odômetro</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">Nenhum abastecimento registrado ainda</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">{r.date}</td>
                  <td className="py-3">{r.driverName}</td>
                  <td className="py-3 text-muted-foreground">{r.vehicle}</td>
                  <td className="py-3 font-mono text-xs">{r.plate}</td>
                  <td className="py-3">{r.liters} L</td>
                  <td className="py-3">{brl(r.pricePerL)}</td>
                  <td className="py-3">{brl(r.total)}</td>
                  <td className="py-3">{num(r.odometer)}</td>
                  <td className="py-3">
                    <button
                      onClick={async () => {
                        try { await delMut.mutateAsync(r.id); toast("Abastecimento removido"); }
                        catch (err: any) { toast.error("Erro ao excluir", { description: err?.message }); }
                      }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Registrar abastecimento</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <form className="space-y-3" onSubmit={onSubmit}>
              <div>
                <label className="text-xs text-muted-foreground">Motorista</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione</option>
                  {driverOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Veículo</label>
                  <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Placa</label>
                  <input value={plate} onChange={(e) => setPlate(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Data</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Litros</label>
                  <input value={liters} onChange={(e) => setLiters(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">R$/L</label>
                  <input value={ppl} onChange={(e) => setPpl(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Total</label>
                  <input readOnly value={`R$ ${total}`} className="mt-1 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Odômetro</label>
                <input value={odometer} onChange={(e) => setOdometer(e.target.value)} type="number" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Posto</label>
                <input value={station} onChange={(e) => setStation(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Observação</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={2} />
              </div>
              <button type="submit" disabled={createMut.isPending} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {createMut.isPending ? "Salvando..." : "Salvar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FuelChart({ rows }: { rows: ReturnType<typeof useDbFuelEntries>["rows"] }) {
  const data = useMemo(() => {
    const today = parseISODate(todayISO());
    const days: { date: string; label: string; total: number; litros: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      days.push({ date: iso, label, total: 0, litros: 0 });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    for (const r of rows) {
      const e = map.get(r.dateISO);
      if (!e) continue;
      e.total += r.total ?? 0;
      e.litros += r.liters ?? 0;
    }
    return days;
  }, [rows]);

  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Gasto com combustível — 30 dias</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Bar dataKey="total" name="Total" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
