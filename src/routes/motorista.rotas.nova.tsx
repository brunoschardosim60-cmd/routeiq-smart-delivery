import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, MapPin, Gauge, Clock, Loader2, LocateFixed } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCreateAssignedRoute } from "@/lib/routes-db";
import { useClientCompanies } from "@/lib/client-companies";

export const Route = createFileRoute("/motorista/rotas/nova")({
  component: NovaRotaMotorista,
});

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function NovaRotaMotorista() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const driverName = user?.full_name?.trim() || "Motorista";
  const driverId = user?.id ?? "";
  const createMut = useCreateAssignedRoute();
  const { rows: clientCompanies } = useClientCompanies();
  const activeClients = clientCompanies.filter((c) => c.active);

  const [dateISO, setDateISO] = useState(todayISO());
  const [departure, setDeparture] = useState(nowHHMM());
  const [origin, setOrigin] = useState("");
  const [locating, setLocating] = useState(false);
  const [destination, setDestination] = useState("");
  const [totalDeliveries, setTotalDeliveries] = useState(15);
  const [kmStart, setKmStart] = useState<number | "">("");
  const [clientCompanyId, setClientCompanyId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Auto-locate origin on mount
  useEffect(() => {
    locate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function locate(silent = false) {
    if (!("geolocation" in navigator)) {
      if (!silent) toast.error("GPS não disponível neste dispositivo");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
            { headers: { Accept: "application/json" } },
          );
          const j = await r.json();
          const a = j.address ?? {};
          const label =
            [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village]
              .filter(Boolean)
              .join(", ") || j.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setOrigin(label);
        } catch {
          setOrigin(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (!silent) toast.error("Não foi possível obter localização", { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return toast.error("Faça login novamente");
    if (!origin.trim()) return toast.error("Informe a origem");
    if (!destination.trim()) return toast.error("Informe para onde você vai");
    try {
      await createMut.mutateAsync({
        driverId,
        driverName,
        dateISO,
        departure,
        expectedReturn: "",
        origin,
        destination,
        totalDeliveries,
        km: 0,
        kmStart: typeof kmStart === "number" ? kmStart : null,
        kmEnd: null,
        notes: notes || null,
        clientCompanyId: clientCompanyId || null,
        tripType: "diaria",
      });
      toast.success("Rota iniciada");
      navigate({ to: "/motorista/rotas" });
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err?.message ?? String(err) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Iniciar Rota</h1>
          <p className="text-sm text-muted-foreground">
            Origem e horário já vêm preenchidos. Diga só pra onde está indo.
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/motorista/rotas" })}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          Voltar
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Origem (de onde sai)" className="md:col-span-2">
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder={locating ? "Detectando localização..." : "Endereço de saída"}
                  className={`${inputCls} pl-8 pr-24`}
                  required
                />
                <button
                  type="button"
                  onClick={() => locate(false)}
                  className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                  disabled={locating}
                >
                  {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
                  GPS
                </button>
              </div>
            </Field>

            <Field label="Destino (para onde vai)" className="md:col-span-2">
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-primary" />
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex.: Zona Sul - SP / Cliente X"
                  className={`${inputCls} pl-8`}
                  required
                />
              </div>
            </Field>

            <Field label="Data">
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className={inputCls}
                required
              />
            </Field>

            <Field label="Hora de saída">
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="time"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className={`${inputCls} pl-8`}
                  required
                />
              </div>
            </Field>

            <Field label="KM inicial (opcional)">
              <div className="relative">
                <Gauge className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  min={0}
                  value={kmStart}
                  onChange={(e) => setKmStart(e.target.value === "" ? "" : +e.target.value)}
                  placeholder="Hodômetro de saída"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </Field>

            <Field label="Total de entregas">
              <input
                type="number"
                min={1}
                value={totalDeliveries}
                onChange={(e) => setTotalDeliveries(+e.target.value)}
                className={inputCls}
                required
              />
            </Field>

            <Field label="Empresa cliente" className="md:col-span-2">
              <select
                value={clientCompanyId}
                onChange={(e) => setClientCompanyId(e.target.value)}
                className={inputCls}
                required={activeClients.length > 0}
              >
                <option value="">
                  {activeClients.length === 0 ? "Nenhuma empresa cadastrada (peça ao admin)" : "Selecione a empresa..."}
                </option>
                {activeClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Observações" className="md:col-span-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
            </Field>

            <div className="md:col-span-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              KM final e horário de chegada são preenchidos ao <strong>finalizar a rota</strong>. Várias rotas no
              mesmo dia contam como <strong>1 diária</strong> — uma 2ª diária (extra) é lançada pelo administrador
              quando for o caso.
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={createMut.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> {createMut.isPending ? "Salvando..." : "Iniciar rota"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
