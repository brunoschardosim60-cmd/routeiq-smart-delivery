import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getComproveiSyncLogs } from "@/lib/comprovei-admin.functions";

export const Route = createFileRoute("/admin/sync-logs")({
  component: AdminLogsPage,
});

function AdminLogsPage() {
  const fetchLogs = useServerFn(getComproveiSyncLogs);
  const [trigger, setTrigger] = useState<"all" | "manual" | "auto">("all");
  const [status, setStatus] = useState<"all" | "ok" | "error" | "partial">("all");

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["sync-logs", trigger, status],
    queryFn: () => fetchLogs({ data: { trigger, status, limit: 100 } }),
    refetchInterval: 15_000,
  });

  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
  const dur = (a: string, b: string | null) => {
    if (!b) return "—";
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs de sincronização</h1>
          <p className="text-sm text-muted-foreground">Histórico das execuções do cron e dos disparos manuais.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as typeof trigger)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos disparos</option>
            <option value="auto">Cron (automático)</option>
            <option value="manual">Manual</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos status</option>
            <option value="ok">Sucesso</option>
            <option value="error">Erro</option>
            <option value="partial">Parcial</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Execuções recentes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
          ) : (logs?.length ?? 0) === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum log encontrado para os filtros selecionados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium">Início</th>
                  <th className="pb-2 font-medium">Duração</th>
                  <th className="pb-2 font-medium">Disparo</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Eventos</th>
                  <th className="pb-2 font-medium text-right">Rotas</th>
                  <th className="pb-2 font-medium text-right">Paradas</th>
                  <th className="pb-2 font-medium">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {logs?.map((l) => {
                  const Icon = l.status === "ok" ? CheckCircle2 : l.status === "error" ? AlertCircle : AlertTriangle;
                  const variant: "default" | "destructive" | "secondary" =
                    l.status === "ok" ? "default" : l.status === "error" ? "destructive" : "secondary";
                  return (
                    <tr key={l.id} className="border-b border-border/60 last:border-0 align-top">
                      <td className="py-3 whitespace-nowrap">{fmt(l.startedAt)}</td>
                      <td className="py-3 text-muted-foreground">{dur(l.startedAt, l.finishedAt)}</td>
                      <td className="py-3"><Badge variant="outline" className="capitalize">{l.trigger}</Badge></td>
                      <td className="py-3">
                        <Badge variant={variant} className={l.status === "ok" ? "bg-success text-success-foreground" : ""}>
                          <Icon className="h-3 w-3 mr-1" /> {l.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right tabular-nums">{l.eventsCount}</td>
                      <td className="py-3 text-right tabular-nums">{l.routesCount}</td>
                      <td className="py-3 text-right tabular-nums">{l.stopsCount}</td>
                      <td className="py-3 text-muted-foreground max-w-[420px]">{l.message ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
