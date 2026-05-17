import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { MetricCard } from "@/components/MetricCard";
import { RoutesTable } from "@/components/RoutesTable";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/rotas")({
  component: RotasPage,
});

function RotasPage() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { rows: all } = useDbAssignedRoutes();

  if (path !== "/admin/rotas") {
    return <Outlet />;
  }

  const total = all.length;
  const concluidas = all.filter((r) => r.status === "concluido").length;
  const andamento = all.filter((r) => r.status === "em_andamento").length;
  const problema = all.filter((r) => r.status === "problema" || r.status === "atrasado").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rotas</h1>
          <p className="text-xs text-muted-foreground">Todas as rotas da sua empresa</p>
        </div>
        <Link to="/admin/rotas/nova" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nova rota
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total de rotas" value={String(total)} />
        <MetricCard label="Concluídas" value={String(concluidas)} accent="success" />
        <MetricCard label="Em andamento" value={String(andamento)} accent="info" />
        <MetricCard label="Atraso / problema" value={String(problema)} accent="destructive" />
      </div>

      <RoutesTable rows={all} />
    </div>
  );
}
