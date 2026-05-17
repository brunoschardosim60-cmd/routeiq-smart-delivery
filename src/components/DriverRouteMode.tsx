import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  CheckCircle2, MapPin, Navigation, Phone, AlertTriangle, Pause,
  Minus, X, Loader2, ChevronUp, Camera, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useDbAssignedRoutes, useFinishAssignedRoute } from "@/lib/routes-db";
import { supabase } from "@/integrations/supabase/client";
import { useLocationTracker } from "@/hooks/use-location-tracker";
import { getOsrmRoute } from "@/lib/osrm";
import type { RouteRow } from "@/lib/mock-data";

type ViewMode = "full" | "mini" | "hidden";
const STATE_KEY = "routeiq.routeMode.state.v1";
const ROUTE_ID_KEY = "routeiq.routeMode.routeId.v1";

function loadState(): ViewMode {
  if (typeof window === "undefined") return "full";
  const s = sessionStorage.getItem(STATE_KEY);
  if (s === "mini" || s === "hidden" || s === "full") return s;
  return "full";
}

export function DriverRouteMode() {
  const { user, role } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { rows } = useDbAssignedRoutes();

  const active = useMemo<RouteRow | null>(() => {
    if (!user?.id || role !== "motorista") return null;
    const mine = rows.filter(
      (r) => r.driverId === user.id && (r.status === "em_andamento" || r.status === "atrasado"),
    );
    if (mine.length === 0) return null;
    // Pega a mais antiga (departure) primeiro
    return mine.sort((a, b) => (a.dateISO + a.departure).localeCompare(b.dateISO + b.departure))[0];
  }, [rows, user?.id, role]);

  const [view, setView] = useState<ViewMode>("full");

  // Auto reset state quando muda a rota ativa
  useEffect(() => {
    if (!active) return;
    const prevId = sessionStorage.getItem(ROUTE_ID_KEY);
    if (prevId !== active.id) {
      sessionStorage.setItem(ROUTE_ID_KEY, active.id);
      sessionStorage.setItem(STATE_KEY, "full");
      setView("full");
    } else {
      setView(loadState());
    }
  }, [active?.id]);

  function changeView(v: ViewMode) {
    setView(v);
    sessionStorage.setItem(STATE_KEY, v);
  }

  // Tracker GPS — ativo enquanto houver rota em andamento (mesmo minimizado)
  const tracker = useLocationTracker({
    assignedRouteId: active?.id ?? null,
    enabled: !!active && role === "motorista",
  });

  if (role !== "motorista") return null;
  if (path === "/login" || path.startsWith("/reset-password") || path.startsWith("/forgot-password")) return null;
  if (!active) return null;

  if (view === "hidden") {
    return <ReopenChip onReopen={() => changeView("full")} />;
  }
  if (view === "mini") {
    return <MiniBar route={active} tracker={tracker} onExpand={() => changeView("full")} onClose={() => changeView("hidden")} />;
  }
  return <FullOverlay route={active} tracker={tracker} onMinimize={() => changeView("mini")} onClose={() => changeView("hidden")} />;
}

function ReopenChip({ onReopen }: { onReopen: () => void }) {
  return (
    <button
      onClick={onReopen}
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-success px-3 py-2 text-xs font-medium text-success-foreground shadow-lg hover:bg-success/90"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-foreground/60 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success-foreground" />
      </span>
      Em rota
      <ChevronUp className="h-3.5 w-3.5" />
    </button>
  );
}

function MiniBar({
  route, tracker, onExpand, onClose,
}: { route: RouteRow; tracker: ReturnType<typeof useLocationTracker>; onExpand: () => void; onClose: () => void }) {
  const remaining = Math.max(0, route.totalDeliveries - (route.done ?? 0));
  const gpsColor = tracker.status === "tracking" ? "bg-success" : tracker.status === "denied" ? "bg-destructive" : "bg-amber-500";
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card pl-3 pr-1.5 py-1.5 shadow-lg">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <button onClick={onExpand} className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-foreground">Em rota</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-mono text-muted-foreground">{route.code}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-foreground">{remaining} restantes</span>
        <span title={`GPS: ${tracker.status}`} className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${gpsColor}`} />
      </button>
      <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-accent" aria-label="Fechar">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function useRemainingKm(
  route: RouteRow,
  currentPosition: { lat: number; lon: number } | null,
) {
  const [km, setKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<{ lat: number; lon: number; t: number } | null>(null);

  useEffect(() => {
    const destLat = route.destinationLat;
    const destLon = route.destinationLon;
    if (destLat == null || destLon == null || !currentPosition) return;

    // throttle: só recalcula se >150m moveu OU >60s
    const prev = lastFetchRef.current;
    const dLat = prev ? Math.abs(prev.lat - currentPosition.lat) : Infinity;
    const dLon = prev ? Math.abs(prev.lon - currentPosition.lon) : Infinity;
    const dt = prev ? Date.now() - prev.t : Infinity;
    if (dLat < 0.0015 && dLon < 0.0015 && dt < 60_000) return;

    let cancelled = false;
    setLoading(true);
    lastFetchRef.current = { lat: currentPosition.lat, lon: currentPosition.lon, t: Date.now() };
    getOsrmRoute(currentPosition, { lat: destLat, lon: destLon })
      .then((r) => { if (!cancelled) setKm(r.km); })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [route.destinationLat, route.destinationLon, currentPosition?.lat, currentPosition?.lon]);

  return { km, loading };
}

function FullOverlay({
  route, tracker, onMinimize, onClose,
}: { route: RouteRow; tracker: ReturnType<typeof useLocationTracker>; onMinimize: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const finishMut = useFinishAssignedRoute();
  const [kmEnd, setKmEnd] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { km: remainingKm, loading: kmLoading } = useRemainingKm(route, tracker.currentPosition);

  const remaining = Math.max(0, route.totalDeliveries - (route.done ?? 0));
  const destinationLabel = route.origin;
  const navQuery = encodeURIComponent(destinationLabel);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhotoFile(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  }

  async function confirmFinish() {
    if (!user?.id) return;
    try {
      let proofUrl: string | null = null;
      if (photoFile) {
        setUploading(true);
        const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const up = await supabase.storage
          .from("delivery-proofs")
          .upload(`${user.id}/${route.id}-${Date.now()}.${ext}`, photoFile, { cacheControl: "3600", upsert: false });
        if (up.error) throw new Error(up.error.message);
        const { data: pub } = supabase.storage.from("delivery-proofs").getPublicUrl(up.data.path);
        proofUrl = pub.publicUrl;
        setUploading(false);
      }
      await finishMut.mutateAsync({
        id: route.id,
        kmEnd: kmEnd.trim() === "" ? null : Number(kmEnd),
        proofPhotoUrl: proofUrl,
      });
      toast.success("Rota finalizada");
      setShowFinish(false);
      setKmEnd("");
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err: any) {
      setUploading(false);
      toast.error("Erro ao finalizar", { description: err?.message ?? String(err) });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-success font-semibold">Em rota</p>
            <p className="text-sm font-mono text-muted-foreground truncate">{route.code}</p>
          </div>
          <GpsBadge status={tracker.status} lastSentAt={tracker.lastSentAt} />
        </div>
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Entregas</p>
            <p className="font-semibold">{remaining} <span className="text-muted-foreground text-xs">restantes</span></p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground">
              {remainingKm != null ? "KM restantes" : "KM previsto"}
            </p>
            <p className="font-semibold inline-flex items-center gap-1">
              {remainingKm != null ? remainingKm.toFixed(1) : (route.km || "—")}
              <span className="text-muted-foreground text-xs">km</span>
              {kmLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </p>
          </div>
          <ElapsedBadge dateISO={route.dateISO} departure={route.departure} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent"
            title="Minimizar"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile metrics */}
      <div className="sm:hidden grid grid-cols-3 gap-2 border-b border-border bg-card/40 px-4 py-3 text-center text-sm">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Entregas</p>
          <p className="font-semibold">{remaining}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">
            {remainingKm != null ? "KM rest." : "KM"}
          </p>
          <p className="font-semibold">{remainingKm != null ? remainingKm.toFixed(1) : (route.km || "—")}</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[10px] uppercase text-muted-foreground">Tempo</p>
          <ElapsedBadge dateISO={route.dateISO} departure={route.departure} compact />
        </div>
      </div>

      {/* Main: next stop */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {!showFinish ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Próxima parada</p>
                <div className="mt-3 flex items-start gap-3">
                  <MapPin className="mt-1 h-6 w-6 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold leading-tight break-words">{destinationLabel}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Saída {route.departure || "—"} · {route.totalDeliveries} entregas no total
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <a
                    href={`https://waze.com/ul?q=${navQuery}&navigate=yes`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Navigation className="h-4 w-4" /> Abrir no Waze
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${navQuery}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-accent"
                  >
                    <Navigation className="h-4 w-4" /> Google Maps
                  </a>
                </div>
              </div>

              {/* Operational quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <QuickAction
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  label="Entrega OK"
                  variant="success"
                  onClick={() => toast.success("Entrega marcada como concluída", { description: "Atualização em breve no painel." })}
                />
                <QuickAction
                  icon={<AlertTriangle className="h-5 w-5" />}
                  label="Cliente ausente"
                  onClick={() => toast.message("Cliente ausente registrado")}
                />
                <QuickAction
                  icon={<Phone className="h-5 w-5" />}
                  label="Suporte"
                  onClick={() => toast.message("Ligando para o suporte…", { description: "Adicione o telefone em Configurações." })}
                />
                <QuickAction
                  icon={<Pause className="h-5 w-5" />}
                  label="Pausa"
                  onClick={() => toast.message("Pausa iniciada")}
                />
              </div>

              <button
                onClick={() => setShowFinish(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-success px-4 py-3 text-sm font-semibold text-success-foreground hover:bg-success/90"
              >
                <CheckCircle2 className="h-4 w-4" /> Finalizar rota
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Precisa do painel completo?{" "}
                <Link to="/motorista/rotas" className="text-primary hover:underline">Abrir Minhas Rotas</Link>
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Finalizar rota</p>
                <p className="mt-1 text-lg font-semibold">{route.code}</p>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">KM final (opcional)</span>
                <input
                  type="number" min={0} value={kmEnd}
                  onChange={(e) => setKmEnd(e.target.value)}
                  placeholder="Hodômetro de chegada"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                />
              </label>

              <div>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Foto do comprovante (opcional)</span>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPickPhoto} className="hidden" />
                {!photoPreview ? (
                  <button
                    type="button" onClick={() => fileRef.current?.click()}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground hover:bg-accent"
                  >
                    <Camera className="h-4 w-4" /> Tirar / escolher foto
                  </button>
                ) : (
                  <div className="relative inline-block">
                    <img src={photoPreview} alt="Comprovante" className="h-28 w-28 rounded-md object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => { setShowFinish(false); setKmEnd(""); setPhotoFile(null); setPhotoPreview(null); }}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >Cancelar</button>
                <button
                  onClick={confirmFinish}
                  disabled={finishMut.isPending || uploading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-60"
                >
                  {(finishMut.isPending || uploading) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {uploading ? "Enviando foto..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon, label, onClick, variant,
}: { icon: React.ReactNode; label: string; onClick: () => void; variant?: "success" }) {
  const base = "flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-4 text-xs font-medium transition-colors";
  const cls = variant === "success"
    ? `${base} border-success/30 bg-success/10 text-success hover:bg-success/20`
    : `${base} border-border bg-card hover:bg-accent`;
  return (
    <button onClick={onClick} className={cls}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ElapsedBadge({
  dateISO, departure, compact,
}: { dateISO: string; departure: string; compact?: boolean }) {
  const startMs = useMemo(() => {
    if (!dateISO || !departure || !/^\d{2}:\d{2}/.test(departure)) return null;
    const [y, m, d] = dateISO.split("-").map(Number);
    const [hh, mm] = departure.split(":").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).getTime();
  }, [dateISO, departure]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (startMs == null) {
    return compact ? <span className="text-sm font-semibold">—</span> : null;
  }
  const diff = Math.max(0, now - startMs);
  const totalMin = Math.floor(diff / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const label = h > 0 ? `${h}h ${m}min` : `${m}min`;
  if (compact) return <span className="text-sm font-semibold">{label}</span>;
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase text-muted-foreground">Em rota há</p>
      <p className="font-semibold inline-flex items-center gap-1"><Clock className="h-3 w-3" />{label}</p>
    </div>
  );
}

function GpsBadge({ status, lastSentAt }: { status: string; lastSentAt: number | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    tracking: { label: "GPS ativo", cls: "bg-success/15 text-success border-success/30" },
    requesting: { label: "Buscando GPS…", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    denied: { label: "GPS bloqueado", cls: "bg-destructive/10 text-destructive border-destructive/30" },
    unavailable: { label: "GPS indisponível", cls: "bg-muted text-muted-foreground border-border" },
    error: { label: "GPS erro", cls: "bg-destructive/10 text-destructive border-destructive/30" },
    idle: { label: "GPS…", cls: "bg-muted text-muted-foreground border-border" },
  };
  const it = map[status] ?? map.idle;
  return (
    <span
      title={lastSentAt ? `Último ponto: ${new Date(lastSentAt).toLocaleTimeString("pt-BR")}` : it.label}
      className={`hidden md:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${it.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === "tracking" ? "bg-success animate-pulse" : status === "denied" || status === "error" ? "bg-destructive" : "bg-amber-500"}`} />
      {it.label}
    </span>
  );
}
