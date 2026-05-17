import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { Progress } from "@/components/ui/progress";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { useCompanyDrivers } from "@/lib/company-members";
import { useDriverProfileMap, useUpsertDriverProfile } from "@/lib/driver-profile";
import { brl, num, pct, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/admin/metas")({
  component: MetasPage,
});

function MetasPage() {
  const { rows } = useDbAssignedRoutes();
  const drivers = useCompanyDrivers();
  const profileMap = useDriverProfileMap();
  const upsert = useUpsertDriverProfile();
  const [month, setMonth] = useState(todayISO().slice(0, 7));

  const list = useMemo(() => {
    const monthRows = rows.filter((r) => r.dateISO.startsWith(month) && r.status === "concluido");
    const byDriver = new Map<string, typeof monthRows>();
    for (const r of monthRows) {
      const arr = byDriver.get(r.driverId) ?? [];
      arr.push(r);
      byDriver.set(r.driverId, arr);
    }
    return drivers.map((d) => {
      const did = d.id.replace(/^auth-/, "");
      const items = byDriver.get(did) ?? [];
      const deliveries = items.reduce((s, r) => s + r.done, 0);
      const secondTrips = items.filter((r) => r.tripType === "segunda").length;
      const baseFromDaily = items.filter((r) => r.tripType !== "segunda").reduce((s, r) => s + (r.driverPay ?? 0), 0);
      const extraFromSecondTrips = items.filter((r) => r.tripType === "segunda").reduce((s, r) => s + (r.driverPay ?? 0), 0);
      const target = profileMap.get(did)?.monthly_target ?? 0;
      return {
        driverId: did,
        name: d.name,
        deliveries,
        routes: items.length,
        secondTrips,
        target,
        pctTarget: target > 0 ? Math.min(100, (deliveries / target) * 100) : 0,
        baseFromDaily,
        extraFromSecondTrips,
        totalPaid: baseFromDaily + extraFromSecondTrips,
        profile: profileMap.get(did),
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [rows, drivers, profileMap, month]);

  const totals = useMemo(() => ({
    drivers: list.length,
    deliveries: list.reduce((s, m) => s + m.deliveries, 0),
    secondTrips: list.reduce((s, m) => s + m.secondTrips, 0),
    totalPaid: list.reduce((s, m) => s + m.totalPaid, 0),
  }), [list]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas Mensais</h1>
          <p className="text-sm text-muted-foreground">Defina a meta de entregas por motorista e acompanhe o progresso do mês</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Motoristas" value={String(totals.drivers)} />
        <MetricCard label="Entregas no mês" value={num(totals.deliveries)} accent="info" />
        <MetricCard label="2ª saídas" value={String(totals.secondTrips)} accent="warning" />
        <MetricCard label="Total a pagar" value={brl(totals.totalPaid)} accent="success" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Progresso por motorista</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum motorista cadastrado ainda.</p>
          )}
          {list.map((m) => (
            <GoalRow
              key={m.driverId}
              row={m}
              saving={upsert.isPending}
              onSave={async (newTarget) => {
                try {
                  await upsert.mutateAsync({
                    data: {
                      userId: m.driverId,
                      dailyRate: Number(m.profile?.daily_rate ?? 0),
                      secondTripRate: Number(m.profile?.second_trip_rate ?? 0),
                      monthlyTarget: newTarget,
                      vehicle: m.profile?.vehicle ?? null,
                      plate: m.profile?.plate ?? null,
                      cnh: m.profile?.cnh ?? null,
                      phone: m.profile?.phone ?? null,
                      cpf: m.profile?.cpf ?? null,
                    },
                  });
                  toast.success(`Meta de ${m.name} atualizada`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Erro ao salvar";
                  toast.error(msg);
                }
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function GoalRow({
  row, onSave, saving,
}: {
  row: {
    driverId: string; name: string; deliveries: number; routes: number;
    secondTrips: number; target: number; pctTarget: number; totalPaid: number;
  };
  onSave: (target: number) => Promise<void>;
  saving: boolean;
}) {
  const [val, setVal] = useState(String(row.target));
  useEffect(() => { setVal(String(row.target)); }, [row.target]);
  const dirty = Number(val || 0) !== row.target;

  return (
    <div className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/motoristas/$driverId" params={{ driverId: row.driverId }} className="font-medium hover:underline">
          {row.name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{row.routes} rotas · {row.secondTrips} 2ª saídas</span>
          <span className="font-semibold text-success">{brl(row.totalPaid)}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="text-muted-foreground">Meta (entregas/mês)</span>
          <input
            type="number"
            value={val}
            min={0}
            onChange={(e) => setVal(e.target.value)}
            className="mt-1 w-28 rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </label>
        <button
          disabled={!dirty || saving}
          onClick={() => onSave(Number(val || 0))}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          <Save className="h-3 w-3" /> Salvar
        </button>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {row.target > 0 ? `${num(row.deliveries)} de ${num(row.target)} entregas` : `${num(row.deliveries)} entregas (sem meta)`}
            </span>
            <span className={row.pctTarget >= 100 ? "font-semibold text-success" : "text-muted-foreground"}>
              {row.target > 0 ? pct(row.pctTarget) : "—"}
            </span>
          </div>
          <Progress value={row.pctTarget} className="mt-1.5 h-2" />
        </div>
      </div>
    </div>
  );
}
