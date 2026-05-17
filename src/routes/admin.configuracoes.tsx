import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, RefreshCw, Activity, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  getComproveiConfig,
  saveComproveiConfig,
  getComproveiSyncState,
  runComproveiSync,
  testComproveiConnection,
} from "@/lib/comprovei.functions";
import { useAuth } from "@/hooks/use-auth";
import { listCompanyMembers } from "@/lib/company-members.functions";
import { listDriverProfiles } from "@/lib/driver-profile.functions";
import { Users, Car } from "lucide-react";

export const Route = createFileRoute("/admin/configuracoes")({
  component: ConfigPage,
});

function GeralTab() {
  const { company } = useAuth();
  return (
    <Card><CardContent className="p-6 space-y-4">
      <div>
        <label className="text-xs text-muted-foreground">Nome da empresa</label>
        <input readOnly value={company?.name ?? ""} className="mt-1 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm" />
      </div>
      <p className="text-xs text-muted-foreground">As demais informações da empresa serão configuradas em breve.</p>
    </CardContent></Card>
  );
}

function UsuariosTab() {
  const fetchMembers = useServerFn(listCompanyMembers);
  const q = useQuery({ queryKey: ["company-members-cfg"], queryFn: () => fetchMembers(), staleTime: 30_000 });
  const members = q.data?.members ?? [];

  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Usuários da empresa</h3>
          <p className="text-xs text-muted-foreground">{members.length} cadastrado(s)</p>
        </div>
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário ainda. Convide motoristas pela tela de Motoristas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">Papéis</th>
                <th className="pb-2 font-medium">Desde</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2">{m.full_name || "—"}</td>
                  <td className="py-2">
                    {m.roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">sem papel</span>
                    ) : m.roles.map((r) => (
                      <span key={r} className="mr-1 inline-block rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">{r}</span>
                    ))}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent></Card>
  );
}

function VeiculosTab() {
  const fetchMembers = useServerFn(listCompanyMembers);
  const fetchProfiles = useServerFn(listDriverProfiles);
  const mQ = useQuery({ queryKey: ["company-members-cfg"], queryFn: () => fetchMembers(), staleTime: 30_000 });
  const pQ = useQuery({ queryKey: ["driver-profiles-cfg"], queryFn: () => fetchProfiles(), staleTime: 30_000 });

  const nameById = new Map((mQ.data?.members ?? []).map((m) => [m.id, m.full_name || "—"]));
  const vehicles = (pQ.data?.rows ?? []).filter((p) => (p.plate ?? p.vehicle));

  return (
    <Card><CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Car className="h-4 w-4" /> Veículos da frota</h3>
          <p className="text-xs text-muted-foreground">Derivado dos cadastros dos motoristas</p>
        </div>
      </div>
      {pQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado. Edite o perfil de cada motorista para adicionar placa e modelo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-medium">Placa</th>
                <th className="pb-2 font-medium">Veículo</th>
                <th className="pb-2 font-medium">Motorista</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.user_id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 font-mono text-xs">{v.plate || "—"}</td>
                  <td className="py-2">{v.vehicle || "—"}</td>
                  <td className="py-2 text-muted-foreground">{nameById.get(v.user_id) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent></Card>
  );
}

function ConfigPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

      <Tabs defaultValue="comprovei">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="comprovei">Integração Comprovei</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="veiculos">Veículos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <GeralTab />
        </TabsContent>

        <TabsContent value="comprovei" className="mt-4 space-y-4">
          <ComproveiTab />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <UsuariosTab />
        </TabsContent>
        <TabsContent value="veiculos" className="mt-4">
          <VeiculosTab />
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <Card><CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground">Custo por KM</label><input defaultValue="0,82" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">Comissão padrão (%)</label><input defaultValue="18" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">Preço médio combustível (R$/L)</label><input defaultValue="6,40" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">Média KM/L padrão</label><input defaultValue="11,5" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComproveiTab() {
  const qc = useQueryClient();
  const fetchCfg = useServerFn(getComproveiConfig);
  const fetchState = useServerFn(getComproveiSyncState);
  const saveCfg = useServerFn(saveComproveiConfig);
  const runSync = useServerFn(runComproveiSync);
  const testConn = useServerFn(testComproveiConnection);

  const cfgQ = useQuery({ queryKey: ["comprovei-config"], queryFn: () => fetchCfg() });
  const stateQ = useQuery({ queryKey: ["comprovei-state"], queryFn: () => fetchState(), refetchInterval: 15000 });

  const [enabled, setEnabled] = useState(false);
  const [eventsUrl, setEventsUrl] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [interval, setInterval] = useState(5);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (cfgQ.data) {
      setEnabled(cfgQ.data.enabled);
      setEventsUrl(cfgQ.data.baseEventsUrl);
      setApiUrl(cfgQ.data.baseApiUrl);
      setUsername(cfgQ.data.username);
      setInterval(cfgQ.data.syncIntervalMinutes);
    }
  }, [cfgQ.data]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveCfg({ data: { enabled, baseEventsUrl: eventsUrl, baseApiUrl: apiUrl, username, password, syncIntervalMinutes: interval } });
      setPassword("");
      await qc.invalidateQueries({ queryKey: ["comprovei-config"] });
      toast.success("Configurações salvas");
    } catch (e) {
      toast.error("Falha ao salvar", { description: e instanceof Error ? e.message : undefined });
    } finally { setSaving(false); }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const r = await runSync({ data: { trigger: "manual" } });
      await qc.invalidateQueries({ queryKey: ["comprovei-state"] });
      toast[r.ok ? "success" : "error"]("Sincronização concluída", { description: r.message });
    } catch (e) {
      toast.error("Falha na sincronização", { description: e instanceof Error ? e.message : undefined });
    } finally { setSyncing(false); }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const r = await testConn();
      toast[r.ok ? "success" : "error"]("Teste de conexão", { description: r.message });
    } catch (e) {
      toast.error("Falha no teste", { description: e instanceof Error ? e.message : undefined });
    } finally { setTesting(false); }
  };

  if (cfgQ.isLoading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Carregando…</CardContent></Card>;
  }

  const state = stateQ.data?.state;
  const totals = stateQ.data?.totals;
  const log = stateQ.data?.log ?? [];

  return (
    <>
      <Card><CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Usar integração Comprovei</p>
            <p className="text-xs text-muted-foreground">Importa eventos (WS205), rotas (WS601), paradas (WS605), produtividade (WS607), tempos (WS608) e médias (WS610) automaticamente.</p>
          </div>
          <button onClick={() => setEnabled(!enabled)} className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${enabled ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        {enabled && (
          <>
            <StatusBanner state={state} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="URL Eventos (WS205)">
                <input value={eventsUrl} onChange={(e) => setEventsUrl(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono" />
              </Field>
              <Field label="URL API base (WS601/605/607/608/610)">
                <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono" />
              </Field>
              <Field label="Usuário API (Basic Auth)">
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: logistica.medica.sp" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Field>
              <Field label={cfgQ.data?.passwordSet ? "Senha API (deixe vazio para manter)" : "Senha API"}>
                <div className="relative mt-1">
                  <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={cfgQ.data?.passwordSet ? "•••••••• (configurada)" : ""} className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Intervalo de sync automático (minutos)">
                <select value={interval} onChange={(e) => setInterval(+e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value={2}>A cada 2 min</option>
                  <option value={5}>A cada 5 min</option>
                  <option value={10}>A cada 10 min</option>
                  <option value={15}>A cada 15 min</option>
                  <option value={30}>A cada 30 min</option>
                </select>
              </Field>
              <Field label="Último eventId sincronizado">
                <p className="mt-2 font-mono text-xs text-muted-foreground">{state?.lastEventId ?? "—"}</p>
              </Field>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <SyncStat icon={<Activity className="h-4 w-4" />} label="Eventos" value={String(totals?.events ?? 0)} />
              <SyncStat icon={<RefreshCw className="h-4 w-4" />} label="Rotas" value={String(totals?.routes ?? 0)} />
              <SyncStat icon={<RefreshCw className="h-4 w-4" />} label="Paradas" value={String(totals?.stops ?? 0)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={onSave} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {saving ? "Salvando…" : "Salvar configuração"}
              </button>
              <button onClick={onTest} disabled={testing} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-60">
                {testing ? "Testando…" : "Testar conexão"}
              </button>
              <button onClick={onSync} disabled={syncing} className="ml-auto inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando…" : "Sincronizar agora"}
              </button>
            </div>
          </>
        )}

        {!enabled && (
          <p className="text-sm text-muted-foreground">A integração está desativada. Ative o toggle para configurar credenciais e começar a sincronizar.</p>
        )}
      </CardContent></Card>

      {enabled && (
        <Card><CardContent className="p-6">
          <h3 className="mb-3 text-sm font-semibold">Histórico de sincronizações</h3>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sincronização registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="pb-2 font-medium">Quando</th>
                    <th className="pb-2 font-medium">Origem</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Eventos</th>
                    <th className="pb-2 font-medium">Rotas</th>
                    <th className="pb-2 font-medium">Paradas</th>
                    <th className="pb-2 font-medium">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((l) => (
                    <tr key={l.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 whitespace-nowrap">{l.startedAt ? new Date(l.startedAt).toLocaleString("pt-BR") : "—"}</td>
                      <td className="py-2"><span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px]">{l.trigger}</span></td>
                      <td className="py-2">
                        {l.status === "ok"
                          ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />OK</span>
                          : <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" />Erro</span>}
                      </td>
                      <td className="py-2">{l.eventsCount}</td>
                      <td className="py-2">{l.routesCount}</td>
                      <td className="py-2">{l.stopsCount}</td>
                      <td className="py-2 text-xs text-muted-foreground truncate max-w-[300px]">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      )}
    </>
  );
}

function StatusBanner({ state }: { state?: { lastStatus: string; lastSyncAt: string | null; lastMessage: string | null } | null }) {
  if (!state) return null;
  const palette =
    state.lastStatus === "ok" ? "border-success/30 bg-success/10 text-success"
    : state.lastStatus === "error" ? "border-destructive/30 bg-destructive/10 text-destructive"
    : state.lastStatus === "running" ? "border-info/30 bg-info/10 text-info"
    : "border-border bg-muted/40 text-muted-foreground";
  const Icon = state.lastStatus === "ok" ? CheckCircle2 : state.lastStatus === "error" ? AlertCircle : state.lastStatus === "running" ? Loader2 : Clock;
  const time = state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleString("pt-BR") : "nunca";
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${palette}`}>
      <Icon className={`h-4 w-4 mt-0.5 ${state.lastStatus === "running" ? "animate-spin" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium capitalize">Status: {state.lastStatus}</p>
        <p className="text-xs opacity-90">Última sync: {time} · {state.lastMessage}</p>
      </div>
    </div>
  );
}

function SyncStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-primary/15 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label} sincronizados</p>
        <p className="text-base font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
