import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications, type RealNotification } from "@/lib/notifications";
import type { NotifType } from "@/lib/notifications.functions";
import { AlertTriangle, Fuel, Route as RouteIcon, DollarSign, Info, XCircle, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const iconFor = (t: NotifType) => {
  switch (t) {
    case "atraso": return AlertTriangle;
    case "problema": return XCircle;
    case "combustivel": return Fuel;
    case "rota": return RouteIcon;
    case "financeiro": return DollarSign;
    default: return Info;
  }
};
const colorFor = (t: NotifType) => {
  switch (t) {
    case "atraso": return "text-warning bg-warning/15";
    case "problema": return "text-destructive bg-destructive/15";
    case "combustivel": return "text-warning bg-warning/15";
    case "rota": return "text-info bg-info/15";
    case "financeiro": return "text-success bg-success/15";
    default: return "text-muted-foreground bg-muted";
  }
};

export function NotificationsList({ audience }: { audience: "admin" | "motorista" }) {
  void audience;
  const navigate = useNavigate();
  const { items, unread, markRead, markAllRead, loading } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const visible = filter === "unread" ? items.filter((n) => !n.read) : items;

  const onClick = (n: RealNotification) => {
    markRead(n.id);
    if (n.link) navigate({ to: n.link.to as never, params: n.link.params as never });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {unread} não lida(s) de {items.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "unread")}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todas</option>
            <option value="unread">Não lidas</option>
          </select>
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
          >
            <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && (
            <p className="p-12 text-center text-sm text-muted-foreground">Carregando…</p>
          )}
          {!loading && visible.length === 0 && (
            <p className="p-12 text-center text-sm text-muted-foreground">
              Nenhuma notificação para exibir.
            </p>
          )}
          {visible.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <button
                key={n.id}
                onClick={() => onClick(n)}
                className={cn(
                  "flex w-full items-start gap-4 border-b border-border/60 p-4 text-left transition-colors hover:bg-accent/40 last:border-0",
                  !n.read && "bg-primary/5",
                )}
              >
                <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md", colorFor(n.type))}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.desc}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{n.timeLabel}</p>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/admin/notificacoes")({
  component: () => <NotificationsList audience="admin" />,
});
