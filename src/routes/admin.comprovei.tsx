import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, RefreshCw, Loader2, Pause } from "lucide-react";
import { toast } from "sonner";
import {
  listAllComproveiConnections,
  syncMyComprovei,
  syncAllDriversComprovei,
  disconnectComproveiAccount,
} from "@/lib/comprovei-driver.functions";
import { drivers } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/comprovei")({
  component: AdminComproveiPage,
});

function AdminComproveiPage() {
  const fetchList = useServerFn(listAllComproveiConnections);
  const fetchSync = useServerFn(syncMyComprovei);
  const fetchSyncAll = useServerFn(syncAllDriversComprovei);
  const fetchDisconnect = useServerFn(disconnectComproveiAccount);
  const qc = useQueryClient();

  const { data: conns, isLoading } = useQuery({
    queryKey: ["admin-comprovei-conns"],
    queryFn: () => fetchList(),
    refetchInterval: 15_000,
  });

  const syncOne = useMutation({
    mutationFn: (driverId: string) => fetchSync({ data: { driverId } }),
    onSuccess: (r, id) => {
      const drv = drivers.find((d) => d.id === id)?.name ?? id;
      toast[r?.ok ? "success" : "error"](`${drv}: ${r?.message ?? "ok"}`);
      qc.invalidateQueries({ queryKey: ["admin-comprovei-conns"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const syncAll = useMutation({
    mutationFn: () => fetchSyncAll(),
    onSuccess: (r) => {
      toast.success(`Sync completa: ${r.drivers} motoristas, ${r.totals.events} eventos`);
      qc.invalidateQueries({ queryKey: ["admin-comprovei-conns"] });
    },
  });

  const disc = useMutation({
    mutationFn: (driverId: string) => fetchDisconnect({ data: { driverId } }),
    onSuccess: () => {
      toast.success("Conta desativada");
      qc.invalidateQueries({ queryKey: ["admin-comprovei-conns"] });
    },
  });

  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name ?? id;
  const driverCompany = (id: string) => drivers.find((d) => d.id === id)?.company;

  const summary = {
    total: conns?.length ?? 0,
    active: conns?.filter((c) => c.syncActive).length ?? 0,
    errors: conns?.filter((c) => c.lastStatus === "error").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conexões Comprovei</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as integrações Comprovei de cada motorista — {summary.active}/{summary.total} ativas
            {summary.errors > 0 && <span className="text-destructive"> · {summary.errors} com erro</span>}.
          </p>
        </div>
        <Button onClick={() => syncAll.mutate()} disabled={syncAll.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncAll.isPending ? "animate-spin" : ""}`} />
          Sincronizar todos
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Conexões por motorista</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (conns?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nenhum motorista conectou sua conta Comprovei ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Motorista</th>
                  <th className="pb-2 font-medium">Empresa</th>
                  <th className="pb-2 font-medium">Usuário Comprovei</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Última sync</th>
                  <th className="pb-2 font-medium">Eventos</th>
                  <th className="pb-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {conns?.map((c) => {
                  const ok = c.lastStatus === "ok";
                  const err = c.lastStatus === "error";
                  return (
                    <tr key={c.driverId} className="border-b border-border/60 last:border-0">
                      <td className="py-3 font-medium">{driverName(c.driverId)}</td>
                      <td className="py-3"><Badge variant="outline">{driverCompany(c.driverId) ?? "—"}</Badge></td>
                      <td className="py-3 font-mono text-xs">{c.comproveiUser}</td>
                      <td className="py-3">
                        {!c.syncActive ? (
                          <Badge variant="secondary"><Pause className="h-3 w-3 mr-1" /> Pausada</Badge>
                        ) : err ? (
                          <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Erro</Badge>
                        ) : ok ? (
                          <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" /> OK</Badge>
                        ) : (
                          <Badge variant="outline">{c.lastStatus}</Badge>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td className="py-3">{c.eventsSynced}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={syncOne.isPending && syncOne.variables === c.driverId}
                            onClick={() => syncOne.mutate(c.driverId)}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncOne.isPending && syncOne.variables === c.driverId ? "animate-spin" : ""}`} />
                            Sync
                          </Button>
                          {c.syncActive && (
                            <Button size="sm" variant="ghost" onClick={() => disc.mutate(c.driverId)}>
                              Pausar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Sync automática roda a cada 5 minutos via cron. Use "Sync" para forçar a execução em um motorista
        específico — o resultado aparece como notificação e a tabela atualiza em até 15 segundos.
      </p>
    </div>
  );
}
