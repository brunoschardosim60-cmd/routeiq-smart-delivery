import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { MetricCard } from "@/components/MetricCard";
import { RoutesTable } from "@/components/RoutesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl, todayISO } from "@/lib/format";
import { Calendar, MapPin, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDbAssignedRoutes } from "@/lib/routes-db";

export const Route = createFileRoute("/motorista/rotas")({
  component: MyRoutesPage,
});

function MyRoutesPage() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, company } = useAuth();
  const { rows: all } = useDbAssignedRoutes();
  const my = useMemo(() => all.filter((r) => r.driverId === user?.id), [all, user?.id]);

  const upcoming = useMemo(() => {
    const today = todayISO();
    return my.filter((r) => r.dateISO >= today).slice(0, 5);
  }, [my]);

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
                  <p className="text-sm font-semibold text-success">{brl(r.revenue)}</p>
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
