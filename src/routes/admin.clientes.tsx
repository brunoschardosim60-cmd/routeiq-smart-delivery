import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientCompanies, useUpsertClientCompany, useDeleteClientCompany } from "@/lib/client-companies";
import { useRecalcRoutesForClient } from "@/lib/routes-db";
import { brl } from "@/lib/format";
import { Plus, Pencil, Trash2, Loader2, Building2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { ClientCompanyRow } from "@/lib/client-companies.functions";

export const Route = createFileRoute("/admin/clientes")({
  component: ClientesPage,
});

interface FormState {
  id?: string;
  name: string;
  dailyAdminRate: number;
  dailyDriverRate: number;
  secondAdminRate: number;
  secondDriverRate: number;
  active: boolean;
}

const empty: FormState = {
  name: "",
  dailyAdminRate: 0,
  dailyDriverRate: 0,
  secondAdminRate: 0,
  secondDriverRate: 0,
  active: true,
};

function ClientesPage() {
  const { rows, isLoading } = useClientCompanies();
  const upsert = useUpsertClientCompany();
  const del = useDeleteClientCompany();
  const recalc = useRecalcRoutesForClient();
  const [form, setForm] = useState<FormState | null>(null);

  const openNew = () => setForm({ ...empty });
  const openEdit = (r: ClientCompanyRow) =>
    setForm({
      id: r.id,
      name: r.name,
      dailyAdminRate: Number(r.daily_admin_rate),
      dailyDriverRate: Number(r.daily_driver_rate),
      secondAdminRate: Number(r.second_admin_rate),
      secondDriverRate: Number(r.second_driver_rate),
      active: r.active,
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return toast.error("Informe o nome");
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Empresa atualizada" : "Empresa criada");
      setForm(null);
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err?.message });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta empresa cliente?")) return;
    try {
      await del.mutateAsync(id);
      toast("Empresa removida");
    } catch (err: any) {
      toast.error("Erro ao remover", { description: err?.message });
    }
  };

  const onRecalc = async (id: string, name: string) => {
    if (!confirm(`Recalcular todas as rotas concluídas de "${name}" com as tarifas atuais?`)) return;
    try {
      const res = await recalc.mutateAsync(id);
      toast.success(`${res.updated}/${res.total} rota(s) atualizadas`);
    } catch (err: any) {
      toast.error("Erro ao recalcular", { description: err?.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Empresas para quem você presta serviço (ex.: Luft) com tarifas de diária e 2ª saída.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova empresa
        </button>
      </div>

      {form && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{form.id ? "Editar empresa" : "Nova empresa cliente"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome da empresa" className="md:col-span-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Luft"
                  className={inputCls}
                  required
                />
              </Field>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border border-border bg-muted/30 p-3">
                <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Diária (1ª saída do dia)
                </p>
                <Field label="Valor pago pelo cliente (admin recebe)">
                  <NumInput value={form.dailyAdminRate} onChange={(v) => setForm({ ...form, dailyAdminRate: v })} />
                </Field>
                <Field label="Valor pago ao motorista">
                  <NumInput value={form.dailyDriverRate} onChange={(v) => setForm({ ...form, dailyDriverRate: v })} />
                </Field>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border border-border bg-muted/30 p-3">
                <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  2ª saída (rotas adicionais no mesmo dia)
                </p>
                <Field label="Valor pago pelo cliente">
                  <NumInput value={form.secondAdminRate} onChange={(v) => setForm({ ...form, secondAdminRate: v })} />
                </Field>
                <Field label="Valor pago ao motorista">
                  <NumInput value={form.secondDriverRate} onChange={(v) => setForm({ ...form, secondDriverRate: v })} />
                </Field>
              </div>

              <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Empresa ativa (aparece ao criar novas rotas)
              </label>

              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={upsert.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {form.id ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Building2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Nenhuma empresa cliente cadastrada ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="pb-2 font-medium">Empresa</th>
                    <th className="pb-2 font-medium">Diária (cliente / motorista)</th>
                    <th className="pb-2 font-medium">2ª saída (cliente / motorista)</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 font-medium">{r.name}</td>
                      <td className="py-3">
                        <span className="text-success">{brl(Number(r.daily_admin_rate))}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span>{brl(Number(r.daily_driver_rate))}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-success">{brl(Number(r.second_admin_rate))}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span>{brl(Number(r.second_driver_rate))}</span>
                      </td>
                      <td className="py-3">
                        {r.active ? (
                          <span className="rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">ativa</span>
                        ) : (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">inativa</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onRecalc(r.id, r.name)}
                          disabled={recalc.isPending}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
                          title="Recalcular rotas existentes com tarifas atuais"
                        >
                          {recalc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
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

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? 0 : +e.target.value)}
      className={inputCls}
    />
  );
}
