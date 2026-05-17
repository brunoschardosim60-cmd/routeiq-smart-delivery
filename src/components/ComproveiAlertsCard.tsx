import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { getComproveiAlerts } from "@/lib/comprovei-admin.functions";
import { drivers } from "@/lib/mock-data";

export function ComproveiAlertsCard() {
  const fetchAlerts = useServerFn(getComproveiAlerts);
  const { data } = useQuery({
    queryKey: ["comprovei-alerts"],
    queryFn: () => fetchAlerts({ data: { staleMinutes: 30 } }),
    refetchInterval: 30_000,
  });

  const alerts = data?.alerts ?? [];
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name ?? id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Alertas de sincronização Comprovei</span>
          {alerts.length > 0 && <Badge variant="destructive">{alerts.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            Todas as contas Comprovei estão sincronizando normalmente.
          </div>
        ) : (
          alerts.map((a) => {
            const Icon = a.severity === "error" ? AlertCircle : AlertTriangle;
            const cls = a.severity === "error"
              ? "bg-destructive/15 text-destructive"
              : "bg-warning/15 text-warning";
            return (
              <Link
                key={a.driverId}
                to="/admin/comprovei"
                className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/40 transition-colors"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${cls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{driverName(a.driverId)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.severity === "error"
                      ? `Sync com erro — ${a.lastMessage ?? "verifique credenciais"}`
                      : a.ageMinutes === null
                      ? "Nunca sincronizou"
                      : `Sem sync há ${a.ageMinutes} min`}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
