import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Loader2, Link2, RefreshCw, Power } from "lucide-react";
import { toast } from "sonner";
import {
  getMyComproveiStatus,
  connectComproveiAccount,
  disconnectComproveiAccount,
  syncMyComprovei,
  testComproveiAccount,
} from "@/lib/comprovei-driver.functions";
import { getCurrentDriverId } from "@/lib/current-driver";
import { drivers } from "@/lib/mock-data";

export const Route = createFileRoute("/motorista/comprovei")({
  component: MotoristaComproveiPage,
});

function MotoristaComproveiPage() {
  const driverId = getCurrentDriverId();
  const driver = drivers.find((d) => d.id === driverId);
  const qc = useQueryClient();

  const fetchStatus = useServerFn(getMyComproveiStatus);
  const fetchConnect = useServerFn(connectComproveiAccount);
  const fetchDisconnect = useServerFn(disconnectComproveiAccount);
  const fetchSync = useServerFn(syncMyComprovei);
  const fetchTest = useServerFn(testComproveiAccount);

  const { data: status, isLoading } = useQuery({
    queryKey: ["my-comprovei", driverId],
    queryFn: () => fetchStatus({ data: { driverId } }),
    refetchInterval: 30_000,
  });

  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");

  const connectMut = useMutation({
    mutationFn: () => fetchConnect({ data: { driverId, username: user, password: pwd } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(r.message);
        setUser(""); setPwd("");
        qc.invalidateQueries({ queryKey: ["my-comprovei"] });
      } else {
        toast.error(r.message);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao conectar"),
  });

  const testMut = useMutation({
    mutationFn: () => fetchTest({ data: { username: user, password: pwd } }),
    onSuccess: (r) => r.ok ? toast.success(r.message) : toast.error(r.message),
  });

  const syncMut = useMutation({
    mutationFn: () => fetchSync({ data: { driverId } }),
    onSuccess: (r) => {
      toast.success(r?.message ?? "Sync executada");
      qc.invalidateQueries({ queryKey: ["my-comprovei"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao sincronizar"),
  });

  const disconnectMut = useMutation({
    mutationFn: () => fetchDisconnect({ data: { driverId } }),
    onSuccess: () => {
      toast.success("Conta desconectada");
      qc.invalidateQueries({ queryKey: ["my-comprovei"] });
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conectar Comprovei</h1>
        <p className="text-sm text-muted-foreground">
          Vincule sua conta Comprovei para sincronizar suas rotas e entregas automaticamente
          {driver && ` — ${driver.name}`}.
        </p>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>
      ) : status?.connected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {status.lastStatus === "error" ? (
                <><AlertTriangle className="h-5 w-5 text-warning" /> Conta com problema</>
              ) : (
                <><CheckCircle2 className="h-5 w-5 text-success" /> Comprovei conectado</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Usuário</p>
                <p className="font-medium">{status.comproveiUser}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sync ativa</p>
                <Badge variant={status.syncActive ? "default" : "secondary"}>
                  {status.syncActive ? "Sim" : "Pausada"}
                </Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Última sync</p>
                <p>{status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString("pt-BR") : "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="capitalize">{status.lastStatus}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Eventos sync</p>
                <p>{status.eventsSynced}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Rotas sync</p>
                <p>{status.routesSynced}</p>
              </div>
            </div>
            {status.lastMessage && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {status.lastMessage}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${syncMut.isPending ? "animate-spin" : ""}`} />
                Sincronizar agora
              </Button>
              <Button onClick={() => disconnectMut.mutate()} disabled={disconnectMut.isPending} size="sm" variant="outline">
                <Power className="h-4 w-4 mr-2" /> Desconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-5 w-5" /> Vincular conta Comprovei
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); connectMut.mutate(); }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="cu">Usuário Comprovei</Label>
                <Input id="cu" value={user} onChange={(e) => setUser(e.target.value)} required autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp">Senha / Token Comprovei</Label>
                <Input id="cp" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">
                  Sua senha é criptografada e armazenada com segurança no servidor. Ela nunca é exibida novamente.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={connectMut.isPending || !user || !pwd}>
                  {connectMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Conectar conta
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => testMut.mutate()}
                  disabled={testMut.isPending || !user || !pwd}
                >
                  Testar conexão
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
