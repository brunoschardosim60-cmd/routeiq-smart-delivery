import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { RoutesTable } from "@/components/RoutesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl, todayISO } from "@/lib/format";
import { Calendar, CheckCircle2, MapPin, Plus, Loader2, Clock, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useDbAssignedRoutes, useFinishAssignedRoute } from "@/lib/routes-db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/motorista/rotas")({
  component: MyRoutesPage,
});

function MyRoutesPage() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, company } = useAuth();
  const { rows: all } = useDbAssignedRoutes();
  const my = useMemo(() => all.filter((r) => r.driverId === user?.id), [all, user?.id]);
  const inProgress = useMemo(() => my.filter((r) => r.status === "em_andamento" || r.status === "atrasado"), [my]);
  const finishMut = useFinishAssignedRoute();
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [kmEnd, setKmEnd] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upcoming = useMemo(() => {
    const today = todayISO();
    return my.filter((r) => r.dateISO >= today && r.status !== "concluido").slice(0, 5);
  }, [my]);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhotoFile(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  }

  async function confirmFinish(id: string) {
    if (!user?.id) return;
    try {
      let proofUrl: string | null = null;
      if (photoFile) {
        setUploading(true);
        const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${id}-${Date.now()}.${ext}`;
        const up = await supabase.storage.from("delivery-proofs").upload(path, photoFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (up.error) throw new Error(up.error.message);
        const { data: pub } = supabase.storage.from("delivery-proofs").getPublicUrl(path);
        proofUrl = pub.publicUrl;
        setUploading(false);
      }
      await finishMut.mutateAsync({
        id,
        kmEnd: kmEnd.trim() === "" ? null : Number(kmEnd),
        proofPhotoUrl: proofUrl,
      });
      toast.success("Rota finalizada");
      setFinishingId(null);
      setKmEnd("");
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err: any) {
      setUploading(false);
      toast.error("Erro ao finalizar", { description: err?.message ?? String(err) });
    }
  }

  if (path !== "/motorista/rotas") {
    return <Outlet />;
  }

  const totalEntregas = my.reduce((sum, r) => sum + r.totalDeliveries, 0);
  const totalKm = my.reduce((sum, r) => sum + r.km, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Minhas Rotas</h1>
        <Link to="/motorista/rotas/nova" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Adicionar Rota
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Rotas realizadas" value={String(my.length)} />
        <MetricCard label="Total de entregas" value={String(totalEntregas)} accent="info" />
        <MetricCard label="KM total" value={`${totalKm} km`} />
        <MetricCard label="Empresa" value={company?.name ?? "—"} accent="success" />
      </div>

      {inProgress.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Em andamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {inProgress.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                      <span className="rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                        em andamento
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{r.origin}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3 w-3" /> {r.date} · saída {r.departure} · {r.totalDeliveries} entregas
                    </p>
                    <ElapsedRow dateISO={r.dateISO} departure={r.departure} />
                  </div>
                  {finishingId !== r.id && (
                    <button
                      onClick={() => { setFinishingId(r.id); setKmEnd(""); }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-2 text-xs font-medium text-success-foreground hover:bg-success/90"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar rota
                    </button>
                  )}
                </div>

                {finishingId === r.id && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">
                          KM final (opcional)
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={kmEnd}
                          onChange={(e) => setKmEnd(e.target.value)}
                          placeholder="Hodômetro de chegada"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                        />
                      </label>
                      <div className="block">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">
                          Foto do comprovante (opcional)
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={onPickPhoto}
                          className="hidden"
                        />
                        {!photoPreview ? (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                          >
                            <Camera className="h-4 w-4" /> Tirar / escolher foto
                          </button>
                        ) : (
                          <div className="relative inline-block">
                            <img src={photoPreview} alt="Comprovante" className="h-24 w-24 rounded-md object-cover border border-border" />
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
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => { setFinishingId(null); setKmEnd(""); setPhotoFile(null); setPhotoPreview(null); }}
                        className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => confirmFinish(r.id)}
                        disabled={finishMut.isPending || uploading}
                        className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-60"
                      >
                        {(finishMut.isPending || uploading) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {uploading ? "Enviando foto..." : "Confirmar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Próximas rotas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{r.origin}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3 w-3" /> {r.date} · saída {r.departure} · {r.totalDeliveries} entregas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Pagto</p>
                  <p className="text-sm font-semibold text-success">{brl(r.driverPay ?? 0)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <RoutesTable
        rows={my}
        showDriverFilter={false}
        showCompanyFilter={false}
        showActions={false}
      />
    </div>
  );
}

function ElapsedRow({ dateISO, departure }: { dateISO: string; departure: string }) {
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
  if (startMs == null) return null;
  const diff = Math.max(0, now - startMs);
  const totalMin = Math.floor(diff / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const label = h > 0 ? `${h}h ${m}min` : `${m}min`;
  return (
    <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-info/10 px-2 py-0.5 text-[11px] font-medium text-info">
      <Clock className="h-3 w-3" /> em rota há {label}
    </p>
  );
}
