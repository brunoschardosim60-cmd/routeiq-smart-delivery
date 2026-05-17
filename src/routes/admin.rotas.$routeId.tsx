import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { useDbAssignedRoutes, useDeleteAssignedRoute, useUpdateAssignedRoute } from "@/lib/routes-db";
import { useDbFuelEntries } from "@/lib/fuel-db";
import { ArrowLeft, MapPin, Pencil, Trash2, Loader2, Fuel, Image as ImageIcon } from "lucide-react";
import { brl, num } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/rotas/$routeId")({
  component: RouteDetail,
});

function RouteDetail() {
  const { routeId } = Route.useParams();
  const navigate = useNavigate();
  const { rows, raw, isLoading } = useDbAssignedRoutes();
  const { rows: fuel } = useDbFuelEntries();
  const r = rows.find((x) => x.id === routeId);
  const rawRow = raw.find((x) => x.id === routeId);
  const proofPhotoUrl = rawRow?.proof_photo_url ?? null;
  const updateMut = useUpdateAssignedRoute();
  const delMut = useDeleteAssignedRoute();
  const [editing, setEditing] = useState(false);
  const [revenue, setRevenue] = useState("");
  const [driverPay, setDriverPay] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [notes, setNotes] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Link to="/admin/rotas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando rota…</CardContent></Card>
      </div>
    );
  }

  if (!r) {
    return (
      <div className="space-y-4">
        <Link to="/admin/rotas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Rota não encontrada.</CardContent></Card>
      </div>
    );
  }

  const margin = (r.revenue ?? 0) - (r.cost ?? 0);
  const fuelOfRoute = fuel.filter((f) => f.assignedRouteId === r.id);
  const fuelTotal = fuelOfRoute.reduce((s, f) => s + f.total, 0);

  const openEdit = () => {
    setRevenue(String(r.revenue ?? 0));
    setDriverPay(String(r.driverPay ?? 0));
    setKmEnd(String(r.km ?? 0));
    setNotes("");
    setEditing(true);
  };

  const save = async () => {
    try {
      const rev = Number(revenue);
      const dp = Number(driverPay);
      await updateMut.mutateAsync({
        id: r.id,
        revenue: isFinite(rev) ? rev : undefined,
        driverPay: isFinite(dp) ? dp : undefined,
        cost: isFinite(dp) ? dp : undefined,
        km: kmEnd ? Number(kmEnd) : undefined,
        notes: notes || undefined,
      });
      toast.success("Rota atualizada");
      setEditing(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar", { description: err?.message });
    }
  };

  const remove = async () => {
    if (!confirm("Excluir esta rota? Esta ação não pode ser desfeita.")) return;
    if (!confirm("Confirmar exclusão definitiva?")) return;
    try {
      await delMut.mutateAsync(r.id);
      toast.success("Rota excluída");
      navigate({ to: "/admin/rotas" });
    } catch (err: any) {
      toast.error("Erro ao excluir", { description: err?.message });
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/rotas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rota {r.code}</h1>
          <p className="text-sm text-muted-foreground">{r.driverName} · {r.date} · saída {r.departure || "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          <button onClick={openEdit} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <button onClick={remove} disabled={delMut.isPending} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-xs text-destructive hover:bg-destructive/15 disabled:opacity-60">
            {delMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Excluir
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex h-72 flex-col items-center justify-center bg-muted/30 text-muted-foreground">
            <MapPin className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">{r.origin}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-xl font-semibold mt-1">{brl(r.revenue ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Pagto motorista</p><p className="text-xl font-semibold mt-1">{brl(r.driverPay ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Combustível (vinculado)</p><p className="text-xl font-semibold mt-1">{brl(fuelTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Margem líquida</p><p className={`text-xl font-semibold mt-1 ${margin - fuelTotal >= 0 ? "text-success" : "text-destructive"}`}>{brl(margin - fuelTotal)}</p></CardContent></Card>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">Editar valores</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Faturamento (admin)"><input type="number" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} className={cls} /></Field>
            <Field label="Pagto motorista"><input type="number" step="0.01" value={driverPay} onChange={(e) => setDriverPay(e.target.value)} className={cls} /></Field>
            <Field label="KM rodado"><input type="number" value={kmEnd} onChange={(e) => setKmEnd(e.target.value)} className={cls} /></Field>
            <Field label="Observação adicional (opcional)" className="md:col-span-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cls} />
            </Field>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">Cancelar</button>
              <button onClick={save} disabled={updateMut.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Tipo" value={r.tripType === "segunda" ? "2ª saída" : r.tripType === "avulsa" ? "Avulsa" : "Diária"} />
          <Row label="Entregas" value={`${r.done} / ${r.totalDeliveries}`} />
          <Row label="Origem / Destino" value={r.origin} />
          <Row label="Saída prevista" value={r.departure || "—"} />
          <Row label="Retorno previsto" value={r.expectedReturn || "—"} />
          <Row label="KM rodado" value={`${num(r.km)} km`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Fuel className="h-4 w-4" /> Combustível vinculado</CardTitle></CardHeader>
        <CardContent>
          {fuelOfRoute.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum abastecimento vinculado a esta rota.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Litros</th>
                  <th className="pb-2 font-medium">R$/L</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Posto</th>
                </tr>
              </thead>
              <tbody>
                {fuelOfRoute.map((f) => (
                  <tr key={f.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2">{f.date}</td>
                    <td className="py-2">{f.liters} L</td>
                    <td className="py-2">{brl(f.pricePerL)}</td>
                    <td className="py-2">{brl(f.total)}</td>
                    <td className="py-2">{f.station ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Comprovante de entrega</CardTitle></CardHeader>
        <CardContent>
          {proofPhotoUrl ? (
            <a href={proofPhotoUrl} target="_blank" rel="noreferrer">
              <img src={proofPhotoUrl} alt="Comprovante" className="max-h-96 rounded-md border border-border" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma foto enviada pelo motorista.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const cls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
