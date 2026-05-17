import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getComproveiSyncState, runComproveiSync } from "@/lib/comprovei.functions";

export function ComproveiSyncIndicator() {
  const fetchState = useServerFn(getComproveiSyncState);
  const runSync = useServerFn(runComproveiSync);
  const [state, setState] = useState<Awaited<ReturnType<typeof fetchState>>["state"]>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const s = await fetchState();
        if (mounted) setState(s.state);
      } catch { /* ignore */ }
    };
    load();
    const id = window.setInterval(load, 30000);
    return () => { mounted = false; window.clearInterval(id); };
  }, [fetchState]);

  const onClick = async () => {
    setSyncing(true);
    try {
      const r = await runSync({ data: { trigger: "manual" } });
      const s = await fetchState();
      setState(s.state);
      toast[r.ok ? "success" : "error"]("Sincronização concluída", { description: r.message });
    } catch (e) {
      toast.error("Falha na sincronização", { description: e instanceof Error ? e.message : undefined });
    } finally { setSyncing(false); }
  };

  const status = state?.lastStatus ?? "idle";
  const Icon = syncing || status === "running" ? Loader2 : status === "ok" ? CheckCircle2 : status === "error" ? AlertCircle : RefreshCw;
  const color = status === "ok" ? "text-success" : status === "error" ? "text-destructive" : status === "running" ? "text-info" : "text-muted-foreground";
  const time = state?.lastSyncAt ? new Date(state.lastSyncAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <button
      onClick={onClick}
      disabled={syncing}
      title={state?.lastMessage ?? "Sincronizar Comprovei"}
      className="hidden md:flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-60"
    >
      <Icon className={`h-3.5 w-3.5 ${color} ${syncing || status === "running" ? "animate-spin" : ""}`} />
      <div className="leading-tight text-left">
        <p className="font-medium">Comprovei</p>
        <p className="text-muted-foreground">Sync {time}</p>
      </div>
    </button>
  );
}
