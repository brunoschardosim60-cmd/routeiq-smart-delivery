import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Clock, Crosshair, Route as RouteIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDbAssignedRoutes, useCreateAssignedRoute } from "@/lib/routes-db";
import { AddressInput } from "@/components/AddressInput";
import { reverseGeocode, computeRouteKm, type AddressSuggestion } from "@/lib/geo.functions";

export const Route = createFileRoute("/motorista/rotas/nova")({
  component: NovaRotaMotorista,
});

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function NovaRotaMotorista() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const driverName = user?.full_name?.trim() || "Motorista";
  const driverId = user?.id ?? "";
  const { rows: all } = useDbAssignedRoutes();
  const createMut = useCreateAssignedRoute();
  const reverseFn = useServerFn(reverseGeocode);
  const kmFn = useServerFn(computeRouteKm);

  const [dateISO, setDateISO] = useState(todayISO());
  const [departure, setDeparture] = useState(nowHM());
  const [origin, setOrigin] = useState("");
  const [originCoord, setOriginCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [destCoord, setDestCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [notes, setNotes] = useState("");
  const [estKm, setEstKm] = useState<number | null>(null);

  // Puxa a localização atual do motorista para a origem
  const fetchLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Localização não disponível neste dispositivo");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setOriginCoord({ lat, lon });
        try {
          const r = await reverseFn({ data: { lat, lon } });
          if (r.ok && r.address) setOrigin(r.address);
        } catch {
          /* ignore */
        } finally {
          setLocating(false);
        }
      },
      () => {
        toast.error("Não foi possível obter sua localização. Verifique as permissões.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  // Ao abrir, tenta pegar a localização automaticamente
  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalcula a distância estimada sempre que origem e destino estiverem definidos
  useEffect(() => {
    if (!origin.trim() || !destination.trim()) {
      setEstKm(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await kmFn({ data: { origin, destination } });
        if (!cancelled) setEstKm(r.ok ? r.km : null);
      } catch {
        if (!cancelled) setEstKm(null);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [origin, destination, kmFn]);

  const sameDayCount = useMemo(
    () => all.filter((r) => r.driverId === driverId && r.dateISO === dateISO).length,
    [all, dateISO, driverId],
  );
  const willBeSecond = sameDayCount >= 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return toast.error("Faça login novamente");
    if (!origin.trim()) return toast.error("Informe a origem");
    if (!destination.trim()) return toast.error("Informe o destino");
    try {
      // garante o KM calculado pelo site (não pelo motorista)
      let km = estKm ?? 0;
      if (!km) {
        const r = await kmFn({ data: { origin, destination } });
        km = r.ok ? r.km : 0;
      }
      const created = await createMut.mutateAsync({
        driverId,
        driverName,
        dateISO,
        departure,
        origin,
        destination,
        totalDeliveries: 0,
        km,
        notes: notes || null,
      });
      toast.success("Rota criada", {
        description: willBeSecond ? "2ª saída do dia" : "1ª saída do dia",
      });
      navigate({ to: "/motorista/rotas/$routeId", params: { routeId: created.id } });
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err?.message ?? String(err) });
    }
  };

  const onPickOrigin = (s: AddressSuggestion) => setOriginCoord({ lat: s.lat, lon: s.lon });
  const onPickDest = (s: AddressSuggestion) => setDestCoord({ lat: s.lat, lon: s.lon });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adicionar Rota</h1>
          <p className="text-sm text-muted-foreground">
            A origem é sua localização atual. Informe o destino — o KM é calculado automaticamente.
          </p>
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
              <Field label="Hora de saída">
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} className={`${inputCls} pl-8`} required />
                </div>
              </Field>

              <Field label="Origem (sua localização atual)" className="md:col-span-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <AddressInput
                      value={origin}
                      onChange={setOrigin}
                      onSelect={onPickOrigin}
                      placeholder="Localizando você..."
                      className={`${inputCls} pl-8`}
                      iconColor="text-muted-foreground"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchLocation}
                    disabled={locating}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-accent disabled:opacity-60"
                    title="Usar minha localização"
                  >
                    {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Destino (para onde vai)" className="md:col-span-2">
                <AddressInput
                  value={destination}
                  onChange={setDestination}
                  onSelect={onPickDest}
                  placeholder="Comece a digitar o endereço..."
                  className={`${inputCls} pl-8`}
                />
              </Field>

              <Field label="Observações" className="md:col-span-2">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
              </Field>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={createMut.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {createMut.isPending ? "Salvando..." : "Criar rota"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><RouteIcon className="h-3.5 w-3.5" /> Distância estimada (site)</p>
              <p className="text-2xl font-semibold">{estKm != null ? `${estKm} km` : "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">KM final é calculado pelo site ao finalizar a rota.</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">Já tem {sameDayCount} rota(s) nesse dia</p>
              <p className={`mt-1 text-sm font-medium ${willBeSecond ? "text-info" : "text-success"}`}>
                {willBeSecond ? "Será registrada como 2ª saída" : "Será a 1ª saída do dia"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Hora de chegada e total de entregas são preenchidos automaticamente quando você finalizar a rota.
            </p>
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
