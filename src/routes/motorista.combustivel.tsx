import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { brl, num, todayISO } from "@/lib/format";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useDbFuelEntries, useCreateFuelEntry, useDeleteFuelEntry } from "@/lib/fuel-db";

export const Route = createFileRoute("/motorista/combustivel")({
  component: CombustivelMotoristaPage,
});

function CombustivelMotoristaPage() {
  const { user } = useAuth();
  const driverName = user?.full_name?.trim() || "Motorista";
  const { rows } = useDbFuelEntries();
  const createMut = useCreateFuelEntry();
  const delMut = useDeleteFuelEntry();
  const my = useMemo(() => rows.filter((r) => r.driverId === user?.id), [rows, user?.id]);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [liters, setLiters] = useState("");
  const [ppl, setPpl] = useState("");
  const [odometer, setOdometer] = useState("");
  const [station, setStation] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const total = (Number(liters || 0) * Number(ppl || 0)).toFixed(2);

  const reset = () => {
    setLiters(""); setPpl(""); setOdometer(""); setStation(""); setNotes("");
    setVehicle(""); setPlate(""); setDate(todayISO());
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const litersN = Number(liters);
    const pplN = Number(ppl);
    if (!litersN || !pplN) { toast.error("Preencha litros e R$/L"); return; }
    try {
      await createMut.mutateAsync({
        driverName,
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
      reset(); setOpen(false);
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
        <MetricCard label="Abastecimentos no mês" value={String(my.length)} />
        <MetricCard label="Total gasto" value={brl(my.reduce((a, r) => a + r.total, 0))} accent="warning" />
        <MetricCard label="Média KM/L" value="—" accent="success" />
        <MetricCard label="Litros no mês" value={`${my.reduce((a, r) => a + r.liters, 0)} L`} />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Veículo</th>
                <th className="pb-2 font-medium">Litros</th>
                <th className="pb-2 font-medium">R$/L</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Odômetro</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {my.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum abastecimento registrado ainda</td></tr>
              )}
              {my.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">{r.date}</td>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Veículo</label>
                  <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Fiorino, Sprinter..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Placa</label>
                  <input value={plate} onChange={(e) => setPlate(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="ABC1D23" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Odômetro</label>
                <input value={odometer} onChange={(e) => setOdometer(e.target.value)} type="number" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Posto</label>
                <input value={station} onChange={(e) => setStation(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ipiranga, Shell..." />
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
