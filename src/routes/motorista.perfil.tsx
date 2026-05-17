import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { brl } from "@/lib/format";
import { Loader2, Save, Camera } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useMyDriverProfile, useUpsertDriverProfile } from "@/lib/driver-profile";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { updateMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/motorista/perfil")({
  component: MeuPerfil,
});

function MeuPerfil() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useMyDriverProfile();
  const upsert = useUpsertDriverProfile();
  const updateProfile = useServerFn(updateMyProfile);
  const p = data?.row;

  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [cnh, setCnh] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVehicle(p?.vehicle ?? "");
    setPlate(p?.plate ?? "");
    setCnh(p?.cnh ?? "");
    setPhone(p?.phone ?? "");
    setCpf(p?.cpf ?? "");
  }, [p]);

  const name = user?.full_name?.trim() || "Motorista";
  const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const avatarUrl = user?.avatar_url ?? null;

  const save = async () => {
    if (!user?.id) return;
    try {
      await upsert.mutateAsync({
        data: {
          userId: user.id,
          dailyRate: Number(p?.daily_rate ?? 0),
          secondTripRate: Number(p?.second_trip_rate ?? 0),
          monthlyTarget: p?.monthly_target ?? 0,
          vehicle: vehicle || null,
          plate: plate || null,
          cnh: cnh || null,
          phone: phone || null,
          cpf: cpf || null,
        },
      });
      toast.success("Perfil atualizado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto muito grande (máx 5MB)"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600", upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ data: { avatar_url: pub.publicUrl } });
      await qc.invalidateQueries({ queryKey: ["auth", "ctx"] });
      toast.success("Foto atualizada");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro no upload";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Foto, veículo, documentos e valores acordados</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary text-xl font-semibold">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                initials || "?"
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card shadow hover:bg-accent disabled:opacity-50"
              aria-label="Trocar foto"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{name}</p>
            <p className="text-xs text-muted-foreground">Clique no ícone da câmera para enviar uma foto</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="Diária base" value={brl(Number(p?.daily_rate ?? 0))} accent="success" />
        <MetricCard label="2ª saída" value={brl(Number(p?.second_trip_rate ?? 0))} accent="info" />
        <MetricCard label="Meta mensal" value={`${p?.monthly_target ?? 0} entregas`} />
      </div>
      <p className="text-xs text-muted-foreground -mt-3">Esses valores são definidos pelo administrador.</p>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados editáveis</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Veículo"><input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={inp} placeholder="Fiorino" /></Field>
              <Field label="Placa"><input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className={inp} placeholder="ABC1D23" /></Field>
              <Field label="CNH"><input value={cnh} onChange={(e) => setCnh(e.target.value)} className={inp} /></Field>
              <Field label="Telefone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} /></Field>
              <Field label="CPF"><input value={cpf} onChange={(e) => setCpf(e.target.value)} className={inp} /></Field>
              <div className="md:col-span-2 flex justify-end pt-2">
                <button onClick={save} disabled={upsert.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const inp = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
