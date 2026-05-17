import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanyDrivers } from "@/lib/company-members";
import { useDbAssignedRoutes, useCreateAssignedRoute, useDeleteAssignedRoute } from "@/lib/routes-db";
import { useServerFn } from "@tanstack/react-start";
import { updateRouteCoords } from "@/lib/routes-db.functions";
import { brl, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useClientCompanies } from "@/lib/client-companies";
import { AddressAutocomplete, computeRouteKm, type AddressSuggestion } from "@/components/AddressAutocomplete";

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
  const saveCoords = useServerFn(updateRouteCoords);

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
  const [originCoord, setOriginCoord] = useState<AddressSuggestion | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationCoord, setDestinationCoord] = useState<AddressSuggestion | null>(null);
  const [totalDeliveries, setTotalDeliveries] = useState(20);
  const [km, setKm] = useState(80);
  const [kmAuto, setKmAuto] = useState(false);
  const [kmLoading, setKmLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const { rows: clientCompanies } = useClientCompanies();
  const activeClients = clientCompanies.filter((c) => c.active);
  const [clientCompanyId, setClientCompanyId] = useState<string>("");
  const [isAvulsa, setIsAvulsa] = useState(false);
  const [avulsaRevenue, setAvulsaRevenue] = useState<number>(0);
  const [avulsaDriverPay, setAvulsaDriverPay] = useState<number>(0);

  const driver = driverOptions.find((d) => d.id === driverId);

  const sameDayCount = useMemo(
    () => assigned.filter((r) => r.driverId === driverId && r.dateISO === dateISO).length,
    [assigned, driverId, dateISO],
  );
  const willBeSecond = sameDayCount >= 1;

  // Auto-calc KM via OSRM quando origem e destino tiverem coords
  useEffect(() => {
    if (!originCoord || !destinationCoord) return;
    let cancelled = false;
    setKmLoading(true);
    computeRouteKm(originCoord, destinationCoord)
      .then((d) => {
        if (cancelled) return;
        // ida + volta (rota fechada)
        const round = Math.round(d * 2);
        setKm(round);
        setKmAuto(true);
      })
      .finally(() => !cancelled && setKmLoading(false));
    return () => {
      cancelled = true;
    };
  }, [originCoord, destinationCoord]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) { toast.error("Selecione um motorista"); return; }
    if (!isAvulsa && !clientCompanyId && activeClients.length > 0) {
      toast.error("Selecione a empresa cliente ou marque como avulsa");
      return;
    }
    try {
      const created = await createMut.mutateAsync({
        driverId: driver.id,
        driverName: driver.name,
        dateISO,
        departure,
        expectedReturn,
        origin,
        destination: destination || null,
        totalDeliveries,
        km,
        notes: notes || null,
        clientCompanyId: isAvulsa ? null : (clientCompanyId || null),
        tripType: isAvulsa ? "avulsa" : "diaria",
        revenue: isAvulsa ? avulsaRevenue : 0,
        driverPay: isAvulsa ? avulsaDriverPay : 0,
        cost: isAvulsa ? avulsaDriverPay : 0,
      });
      // Salvar coords (origem/destino) quando vieram do autocomplete
      if (created?.id && (originCoord || destinationCoord)) {
        try {
          await saveCoords({ data: {
            id: created.id,
            originLat: originCoord?.lat,
            originLon: originCoord?.lon,
            lat: destinationCoord?.lat,
            lon: destinationCoord?.lon,
          }});
        } catch {}
      }
      toast.success(`Rota atribuída a ${driver.name}`, {
        description: isAvulsa ? "Rota avulsa (valores manuais)" : willBeSecond ? "2ª saída do dia" : "1ª saída do dia",
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
              <AddressAutocomplete
                value={origin}
                onChange={(v) => { setOrigin(v); setOriginCoord(null); setKmAuto(false); }}
                onSelect={(s) => setOriginCoord(s)}
                placeholder="Digite o endereço de partida..."
                required
              />
            </Field>
            <Field label="Destino (cidade / endereço)" className="md:col-span-2">
              <AddressAutocomplete
                value={destination}
                onChange={(v) => { setDestination(v); setDestinationCoord(null); setKmAuto(false); }}
                onSelect={(s) => setDestinationCoord(s)}
                biasLat={originCoord?.lat ?? null}
                biasLon={originCoord?.lon ?? null}
                placeholder="Selecione um endereço para calcular o KM automaticamente"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {originCoord
                  ? "Sugestões priorizadas perto da origem."
                  : "Selecione a origem para receber sugestões da região."}
              </p>
            </Field>
            <Field label="Total de entregas">
              <input type="number" min={1} value={totalDeliveries} onChange={(e) => setTotalDeliveries(+e.target.value)} className={inputCls} required />
            </Field>
            <Field label={`KM previsto${kmAuto ? " (ida + volta — calculado)" : ""}`}>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={km}
                  onChange={(e) => { setKm(+e.target.value); setKmAuto(false); }}
                  className={inputCls}
                  required
                />
                {kmLoading && (
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">calculando…</span>
                )}
              </div>
            </Field>
            <div className="md:col-span-2 space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={isAvulsa} onChange={(e) => setIsAvulsa(e.target.checked)} />
                Rota avulsa (valores variáveis, definidos manualmente)
              </label>
              {!isAvulsa ? (
                <Field label="Empresa cliente">
                  <select
                    value={clientCompanyId}
                    onChange={(e) => setClientCompanyId(e.target.value)}
                    className={inputCls}
                    required={activeClients.length > 0}
                  >
                    <option value="">
                      {activeClients.length === 0
                        ? "Nenhuma empresa cliente cadastrada"
                        : "Selecione a empresa..."}
                    </option>
                    {activeClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Receita (valor que você cobra do cliente)">
                    <input type="number" min={0} step="0.01" value={avulsaRevenue}
                      onChange={(e) => setAvulsaRevenue(e.target.value === "" ? 0 : +e.target.value)}
                      className={inputCls} required />
                  </Field>
                  <Field label="Pagamento do motorista">
                    <input type="number" min={0} step="0.01" value={avulsaDriverPay}
                      onChange={(e) => setAvulsaDriverPay(e.target.value === "" ? 0 : +e.target.value)}
                      className={inputCls} required />
                  </Field>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {isAvulsa
                  ? "Os valores informados serão usados como receita e pagamento ao motorista quando a rota for finalizada."
                  : "Os valores serão calculados automaticamente pela tarifa da empresa cliente quando o motorista finalizar a rota (1ª saída ou 2ª saída do dia)."}
              </p>
            </div>

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
