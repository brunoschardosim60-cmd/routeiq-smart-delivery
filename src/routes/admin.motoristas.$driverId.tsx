import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { ArrowLeft, Truck, Pencil, Loader2 } from "lucide-react";
import { brl } from "@/lib/format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCompanyDrivers } from "@/lib/company-members";
import { useDriverProfileMap, useUpsertDriverProfile } from "@/lib/driver-profile";
import { useDbAssignedRoutes } from "@/lib/routes-db";

export const Route = createFileRoute("/admin/motoristas/$driverId")({
  component: DriverProfile,
});

function DriverProfile() {
  const { driverId } = Route.useParams();
  const cleanId = driverId.replace(/^auth-/, "");
  const drivers = useCompanyDrivers();
  const base = drivers.find((d) => d.id === cleanId);
  const profileMap = useDriverProfileMap();
  const profile = profileMap.get(cleanId);
  const { rows } = useDbAssignedRoutes();
  const upsert = useUpsertDriverProfile();

  const [dailyRate, setDailyRate] = useState(0);
  const [secondTripRate, setSecondTripRate] = useState(0);
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [cnh, setCnh] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  useEffect(() => {
    setDailyRate(Number(profile?.daily_rate ?? base?.dailyRate ?? 0));
    setSecondTripRate(Number(profile?.second_trip_rate ?? base?.secondTripRate ?? 0));
    setMonthlyTarget(profile?.monthly_target ?? base?.monthlyTarget ?? 0);
    setVehicle(profile?.vehicle ?? base?.vehicle ?? "");
    setPlate(profile?.plate ?? base?.plate ?? "");
    setCnh(profile?.cnh ?? base?.cnh ?? "");
    setPhone(profile?.phone ?? base?.phone ?? "");
    setCpf(profile?.cpf ?? base?.cpf ?? "");
  }, [profile, base]);

  if (!base) {
    return (
      <div className="space-y-6">
        <Link to="/admin/motoristas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Card><CardContent className="p-10 text-center text-muted-foreground">Motorista não encontrado.</CardContent></Card>
      </div>
    );
  }

  const myRoutes = rows.filter((r) => r.driverId === base.id).slice(0, 10);

  const save = async () => {
    try {
      await upsert.mutateAsync({
        data: {
          userId: cleanId,
          dailyRate, secondTripRate, monthlyTarget,
          vehicle: vehicle || null,
          plate: plate || null,
          cnh: cnh || null,
          phone: phone || null,
          cpf: cpf || null,
        },
      });
      toast.success("Perfil atualizado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/motoristas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
            {base.initials}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-bold">{base.name}</h1>
            <p className="text-sm text-muted-foreground">
              {cpf ? `CPF ${cpf}` : "Sem CPF"} · {cnh ? `CNH ${cnh}` : "Sem CNH"}
            </p>
            <p className="text-xs text-muted-foreground">Admitido em {base.admissionDate}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Truck className="h-3.5 w-3.5" /> {vehicle || "—"} · {plate || "—"}
            </span>
            {phone && <span className="text-xs text-muted-foreground">{phone}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Remuneração, veículo e documentos</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Editar perfil · {base.name}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Diária base (R$)"><input type="number" value={dailyRate} onChange={(e) => setDailyRate(+e.target.value)} className={inp} /></Field>
                <Field label="Valor de 2ª saída (R$)"><input type="number" value={secondTripRate} onChange={(e) => setSecondTripRate(+e.target.value)} className={inp} /></Field>
                <Field label="Meta mensal (entregas)"><input type="number" value={monthlyTarget} onChange={(e) => setMonthlyTarget(+e.target.value)} className={inp} /></Field>
                <Field label="Veículo"><input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={inp} placeholder="Fiorino" /></Field>
                <Field label="Placa"><input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className={inp} placeholder="ABC1D23" /></Field>
                <Field label="CNH"><input value={cnh} onChange={(e) => setCnh(e.target.value)} className={inp} /></Field>
                <Field label="Telefone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} /></Field>
                <Field label="CPF"><input value={cpf} onChange={(e) => setCpf(e.target.value)} className={inp} /></Field>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">Cancelar</button>
                </DialogClose>
                <DialogClose asChild>
                  <button onClick={save} disabled={upsert.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                    {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
                  </button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Diária base" value={brl(dailyRate)} accent="success" />
            <MetricCard label="2ª saída" value={brl(secondTripRate)} accent="info" />
            <MetricCard label="Meta mensal" value={`${monthlyTarget} entregas`} />
            <MetricCard label="Rotas no período" value={String(myRoutes.length)} accent="warning" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de rotas recentes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Origem</th>
                <th className="pb-2 font-medium">Entregas</th>
                <th className="pb-2 font-medium">KM</th>
                <th className="pb-2 font-medium">Pago</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {myRoutes.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Nenhuma rota.</td></tr>
              )}
              {myRoutes.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">{r.date}</td>
                  <td className="py-3">{r.origin}</td>
                  <td className="py-3">{r.totalDeliveries}</td>
                  <td className="py-3">{r.km} km</td>
                  <td className="py-3">{brl(r.driverPay ?? 0)}</td>
                  <td className="py-3 text-muted-foreground">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
