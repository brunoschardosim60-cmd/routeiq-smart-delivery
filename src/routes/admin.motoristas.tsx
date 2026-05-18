import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { drivers as baseDrivers, type Company } from "@/lib/mock-data";
import { addExtraDriver, useExtraDrivers } from "@/lib/extra-drivers";
import { useCompanyDrivers } from "@/lib/company-members";
import { brl } from "@/lib/format";
import { Plus, Search, Eye, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useCurrentCompany, filterByCompany, companyLabel } from "@/lib/current-company";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/motoristas")({
  component: MotoristasPage,
});

function MotoristasPage() {
  const [scope] = useCurrentCompany();
  const extra = useExtraDrivers();
  const members = useCompanyDrivers();
  const allDrivers = useMemo(() => {
    const seen = new Set<string>();
    return [...members, ...extra, ...baseDrivers].filter((d) => {
      const key = d.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [extra, members]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [sort, setSort] = useState<"name" | "rate" | "deliveriesToday">("name");
  const [open, setOpen] = useState(false);

  const scoped = useMemo(() => filterByCompany(allDrivers, scope), [allDrivers, scope]);

  const filtered = useMemo(() => {
    const arr = scoped.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (status !== "todos" && d.status !== status) return false;
      return true;
    });
    arr.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "rate") return b.dailyRate - a.dailyRate;
      return b.deliveriesToday - a.deliveriesToday;
    });
    return arr;
  }, [scoped, q, status, sort]);

  const bsCount = scoped.filter((d) => d.company === "BS").length;
  const dbmCount = scoped.filter((d) => d.company === "DBM").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Motoristas</h1>
          <p className="text-xs text-muted-foreground">Empresa: {companyLabel(scope)}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Adicionar motorista
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total de motoristas" value={String(scoped.length)} />
        <MetricCard label="BS Soluções (fixos)" value={String(bsCount)} accent="success" />
        <MetricCard label="DBM (rotativos)" value={String(dbmCount)} accent="info" />
        <MetricCard label="Em rota agora" value={String(scoped.filter((d) => d.status === "em_rota").length)} accent="warning" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>
            {/* Filtro de empresa agora vem do switcher global no header */}
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="em_rota">Em rota</option>
              <option value="disponivel">Disponível</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as never)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="name">Ordenar por nome</option>
              <option value="rate">Ordenar por diária</option>
              <option value="deliveriesToday">Ordenar por entregas hoje</option>
            </select>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} motorista(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Motorista</th>
                  <th className="pb-2 font-medium">Empresa</th>
                  <th className="pb-2 font-medium">Veículo</th>
                  <th className="pb-2 font-medium">Diária</th>
                  <th className="pb-2 font-medium">2ª saída</th>
                  <th className="pb-2 font-medium">Meta mensal</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Hoje</th>
                  <th className="pb-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                          {d.initials}
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">{d.plate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium border",
                        d.company === "DBM"
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-success/10 text-success border-success/30",
                      )}>
                        {d.company === "BS" ? "BS Soluções" : "DBM"}
                      </span>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {d.company === "BS" ? "Veículo fixo" : "Rotativo"}
                      </p>
                    </td>
                    <td className="py-3 text-muted-foreground">{d.vehicle}</td>
                    <td className="py-3 font-medium">{brl(d.dailyRate)}</td>
                    <td className="py-3 text-muted-foreground">{brl(d.secondTripRate)}</td>
                    <td className="py-3">{d.monthlyTarget} entregas</td>
                    <td className="py-3"><StatusBadge status={d.status} /></td>
                    <td className="py-3">
                      <span className="font-medium">{d.deliveriesToday}</span>{" "}
                      <span className="text-muted-foreground">· {d.kmToday} km</span>
                    </td>
                    <td className="py-3">
                      <Link
                        to="/admin/motoristas/$driverId"
                        params={{ driverId: d.id }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        <Eye className="h-3 w-3" /> Ver perfil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {open && <AddDriverModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function AddDriverModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState<Company>("BS");
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [dailyRate, setDailyRate] = useState("180");
  const [secondTripRate, setSecondTripRate] = useState("90");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome");
    if (!vehicle.trim() || !plate.trim()) return toast.error("Informe veículo e placa");
    addExtraDriver({
      name, company, vehicle, plate,
      dailyRate: Number(dailyRate) || 0,
      secondTripRate: Number(secondTripRate) || 0,
      monthlyTarget: 0,
    });
    toast.success(`${name} cadastrado`);
    onClose();
  };

  const inp = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Novo motorista</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form className="grid grid-cols-2 gap-3" onSubmit={submit}>
          <label className="col-span-2 text-xs">
            Nome completo
            <input value={name} onChange={(e) => setName(e.target.value)} className={inp} required />
          </label>
          <label className="col-span-2 text-xs">
            Empresa
            <select value={company} onChange={(e) => setCompany(e.target.value as Company)} className={inp}>
              <option value="BS">BS Soluções (fixo)</option>
              <option value="DBM">DBM (rotativo)</option>
            </select>
          </label>
          <label className="text-xs">
            Veículo
            <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={inp} placeholder="Fiorino" required />
          </label>
          <label className="text-xs">
            Placa
            <input value={plate} onChange={(e) => setPlate(e.target.value)} className={inp} placeholder="ABC1D23" required />
          </label>
          <label className="text-xs">
            Diária (R$)
            <input type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} className={inp} />
          </label>
          <label className="text-xs">
            2ª saída (R$)
            <input type="number" value={secondTripRate} onChange={(e) => setSecondTripRate(e.target.value)} className={inp} />
          </label>
          <button type="submit" className="col-span-2 mt-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Cadastrar motorista
          </button>
        </form>
      </div>
    </div>
  );
}
