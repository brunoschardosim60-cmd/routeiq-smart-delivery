import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { Plus, Play, MapPin, Fuel, Route as RouteIcon } from "lucide-react";
import { today } from "@/lib/format";

export const Route = createFileRoute("/motorista/dashboard")({
  component: DriverDashboard,
});

function DriverDashboard() {
  const { user } = useAuth();
  const firstName = (user?.full_name?.trim().split(" ")[0]) || "Motorista";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const { rows } = useDbAssignedRoutes();
  const active = rows.find((r) => r.status === "em_andamento");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{greeting}, {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground capitalize">{today()}</p>
      </div>

      {active ? (
        <Card className="border-primary/40">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <RouteIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-wide">Rota em andamento</p>
            </div>
            <div>
              <p className="text-xl font-bold">{active.code}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" /> {active.origin}
              </p>
            </div>
            <Link
              to="/navegar/$routeId"
              params={{ routeId: active.id }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4 fill-current" /> Continuar navegação
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Você não tem rotas em andamento.</p>
            <Link
              to="/motorista/rotas/nova"
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-5 w-5" /> Iniciar nova rota
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/motorista/rotas" className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors">
          <RouteIcon className="h-5 w-5 mb-2 text-primary" />
          <p className="text-sm font-medium">Minhas rotas</p>
          <p className="text-xs text-muted-foreground">{rows.length} no total</p>
        </Link>
        <Link to="/motorista/combustivel" className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors">
          <Fuel className="h-5 w-5 mb-2 text-primary" />
          <p className="text-sm font-medium">Combustível</p>
          <p className="text-xs text-muted-foreground">Registrar abastecimento</p>
        </Link>
      </div>
    </div>
  );
}
