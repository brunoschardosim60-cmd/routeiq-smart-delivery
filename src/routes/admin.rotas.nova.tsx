import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanyDrivers } from "@/lib/company-members";
import { useDbAssignedRoutes, useCreateAssignedRoute, useDeleteAssignedRoute } from "@/lib/routes-db";
import { brl, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/rotas/nova")({
  component: NovaRotaPage,
});

function NovaRotaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const drivers = useCompanyDrivers();
  const { rows: assigned } = useDbAssignedRoutes();
  const createMut = useCreateAssignedRoute();
  const delMut = useDeleteAssignedRoute();

  const driverOptions = useMemo(() => {
    const opts = drivers.map((d) => ({ id: d.id.replace(/^auth-/, ""), name: d.name }));
    if (user?.id && !opts.find((o) => o.id === user.id)) {
      opts.unshift({ id: user.id, name: user.full_name?.trim() || "Eu (admin)" });
    }
    return opts;
  }, [drivers, user?.id, user?.full_name]);

  const [driverId, setDriverId] = useState("");
  useEffect(() => {
    if (!driverId && driverOptions[0]?.id) setDriverId(driverOptions[0].id);
  }, [driverOptions, driverId]);
  const [dateISO, setDateISO] = useState(todayISO());
  const [departure, setDeparture] = useState("08:00");
  const [expectedReturn, setExpectedReturn] = useState("13:00");
  const [origin, setOrigin] = useState("CD São Paulo - Vila Leopoldina");
  const [totalDeliveries, setTotalDeliveries] = useState(20);
  const [km, setKm] = useState(80);
  const [notes, setNotes] = useState("");

  const driver = driverOptions.find((d) => d.id === driverId);

  const sameDayCount = useMemo(
    () => assigned.filter((r) => r.driverId === driverId && r.dateISO === dateISO).length,
    [assigned, driverId, dateISO],
  );
  const willBeSecond = sameDayCount >= 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) { toast.error("Selecione um motorista"); return; }
    try {
      await createMut.mutateAsync({
        driverId: driver.id,
        driverName: driver.name,
        dateISO,
        departure,
        expectedReturn,
        origin,
        totalDeliveries,
        km,
        notes: notes || null,
      });
      toast.success(`Rota atribuída a ${driver.name}`, {
        description: willBeSecond ? "2ª saída do dia" : "1ª saída do dia",
      });
      navigate({ to: "/admin/rotas" });
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err?.message ?? String(err) });
    }
  };

  if (driverOptions.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Nova Rota</h1>
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum motorista cadastrado ainda. Cadastre em <button onClick={() => navigate({ to: "/admin/motoristas" })} className="text-primary underline">Motoristas</button> antes de criar rotas.
        </div>
      </div>
    );
  }

  const recent = assigned.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Rota</h1>
          <p className="text-sm text-muted-foreground">Atribua uma rota — o motorista verá em "Minhas Rotas"</p>
        </div>
        <button onClick={() => navigate({ to: "/admin/rotas" })} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
          Voltar para Rotas
        </button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhes da rota</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Motorista">
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={inputCls}>
                {driverOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Saída">
              <input type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Retorno previsto">
              <input type="time" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Origem (CD / cliente)" className="md:col-span-2">
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Total de entregas">
              <input type="number" min={1} value={totalDeliveries} onChange={(e) => setTotalDeliveries(+e.target.value)} className={inputCls} required />
            </Field>
            <Field label="KM previsto">
              <input type="number" min={0} value={km} onChange={(e) => setKm(+e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Observações" className="md:col-span-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
            </Field>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={createMut.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                <Plus className="h-4 w-4" /> {createMut.isPending ? "Salvando..." : "Atribuir rota"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rotas atribuídas recentemente</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Saída</th>
                  <th className="pb-2 font-medium">Motorista</th>
                  <th className="pb-2 font-medium">Origem</th>
                  <th className="pb-2 font-medium">Entregas</th>
                  <th className="pb-2 font-medium">KM</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">{r.date}</td>
                    <td className="py-3 font-mono text-xs">{r.departure}</td>
                    <td className="py-3">{r.driverName}</td>
                    <td className="py-3 text-muted-foreground truncate max-w-[200px]">{r.origin}</td>
                    <td className="py-3">{r.totalDeliveries}</td>
                    <td className="py-3">{r.km} km</td>
                    <td className="py-3">
                      <button onClick={async () => {
                        try { await delMut.mutateAsync(r.id); toast("Rota removida"); }
                        catch (err: any) { toast.error("Erro ao excluir", { description: err?.message }); }
                      }} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
// silence brl unused
void brl;
