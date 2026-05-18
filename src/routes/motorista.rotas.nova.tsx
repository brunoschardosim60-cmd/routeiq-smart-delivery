import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, MapPin, Gauge, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDbAssignedRoutes, useCreateAssignedRoute } from "@/lib/routes-db";

export const Route = createFileRoute("/motorista/rotas/nova")({
  component: NovaRotaMotorista,
});

function NovaRotaMotorista() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const driverName = user?.full_name?.trim() || "Motorista";
  const driverId = user?.id ?? "";
  const { rows: all } = useDbAssignedRoutes();
  const createMut = useCreateAssignedRoute();

  const [dateISO, setDateISO] = useState(todayISO());
  const [departure, setDeparture] = useState("08:00");
  const [arrival, setArrival] = useState("13:00");
  const [origin, setOrigin] = useState("CD São Paulo - Vila Leopoldina");
  const [destination, setDestination] = useState("");
  const [totalDeliveries, setTotalDeliveries] = useState(15);
  const [kmStart, setKmStart] = useState<number | "">("");
  const [kmEnd, setKmEnd] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  const km = useMemo(() => {
    if (typeof kmStart === "number" && typeof kmEnd === "number" && kmEnd >= kmStart) {
      return kmEnd - kmStart;
    }
    return 0;
  }, [kmStart, kmEnd]);

  const sameDayCount = useMemo(
    () => all.filter((r) => r.driverId === driverId && r.dateISO === dateISO).length,
    [all, dateISO, driverId],
  );
  const willBeSecond = sameDayCount >= 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return toast.error("Faça login novamente");
    if (!origin.trim()) return toast.error("Informe a origem");
    if (!destination.trim()) return toast.error("Informe para onde você vai");
    if (km <= 0) return toast.error("Informe KM inicial e final corretamente");
    try {
      await createMut.mutateAsync({
        driverId,
        driverName,
        dateISO,
        departure,
        expectedReturn: arrival,
        origin,
        destination,
        totalDeliveries,
        km,
        kmStart: typeof kmStart === "number" ? kmStart : null,
        kmEnd: typeof kmEnd === "number" ? kmEnd : null,
        notes: notes || null,
      });
      toast.success("Rota registrada", { description: willBeSecond ? "2ª saída do dia" : "1ª saída do dia" });
      navigate({ to: "/motorista/rotas" });
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err?.message ?? String(err) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adicionar Rota</h1>
          <p className="text-sm text-muted-foreground">Registre sua rota: para onde foi, horários e KM rodado.</p>
        </div>
        <button onClick={() => navigate({ to: "/motorista/rotas" })} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Detalhes da rota</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Data">
                <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={inputCls} required />
              </Field>
              <div />
              <Field label="Origem (de onde sai)" className="md:col-span-2">
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input value={origin} onChange={(e) => setOrigin(e.target.value)} className={`${inputCls} pl-8`} required />
                </div>
              </Field>
              <Field label="Destino (para onde vai)" className="md:col-span-2">
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-primary" />
                  <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex.: Zona Sul - SP / Cliente X" className={`${inputCls} pl-8`} required />
                </div>
              </Field>
              <Field label="Hora de saída">
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} className={`${inputCls} pl-8`} required />
                </div>
              </Field>
              <Field label="Hora de chegada">
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} className={`${inputCls} pl-8`} required />
                </div>
              </Field>
              <Field label="KM inicial">
                <div className="relative">
                  <Gauge className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input type="number" min={0} value={kmStart} onChange={(e) => setKmStart(e.target.value === "" ? "" : +e.target.value)} className={`${inputCls} pl-8`} required />
                </div>
              </Field>
              <Field label="KM final">
                <div className="relative">
                  <Gauge className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input type="number" min={0} value={kmEnd} onChange={(e) => setKmEnd(e.target.value === "" ? "" : +e.target.value)} className={`${inputCls} pl-8`} required />
                </div>
              </Field>
              <Field label="Total de entregas">
                <input type="number" min={1} value={totalDeliveries} onChange={(e) => setTotalDeliveries(+e.target.value)} className={inputCls} required />
              </Field>
              <Field label="Observações" className="md:col-span-2">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
              </Field>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={createMut.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  <Plus className="h-4 w-4" /> {createMut.isPending ? "Salvando..." : "Salvar rota"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">KM rodado calculado</p>
              <p className="text-2xl font-semibold">{km} km</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">Já tem {sameDayCount} rota(s) nesse dia</p>
              <p className={`mt-1 text-sm font-medium ${willBeSecond ? "text-info" : "text-success"}`}>
                {willBeSecond ? "Será registrada como 2ª saída" : "Será a 1ª saída do dia"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
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
