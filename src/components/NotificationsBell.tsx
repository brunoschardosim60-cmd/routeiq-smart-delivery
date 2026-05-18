import { Bell, AlertTriangle, Fuel, Route as RouteIcon, DollarSign, Info, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationsData, type AppNotification, type NotificationType } from "@/lib/mock-data";
import type { Role } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const iconFor = (t: NotificationType) => {
  switch (t) {
    case "atraso": return AlertTriangle;
    case "problema": return XCircle;
    case "combustivel": return Fuel;
    case "rota": return RouteIcon;
    case "financeiro": return DollarSign;
    default: return Info;
  }
};

const colorFor = (t: NotificationType) => {
  switch (t) {
    case "atraso": return "text-warning bg-warning/15";
    case "problema": return "text-destructive bg-destructive/15";
    case "combustivel": return "text-warning bg-warning/15";
    case "rota": return "text-info bg-info/15";
    case "financeiro": return "text-success bg-success/15";
    default: return "text-muted-foreground bg-muted";
  }
};

export function NotificationsBell({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>(
    notificationsData.filter((n) => n.audience === role),
  );
  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const markAllRead = () => setItems((arr) => arr.map((n) => ({ ...n, read: true })));

  const onClick = (n: AppNotification) => {
    setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.link) {
      navigate({ to: n.link.to as never, params: n.link.params as never });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card hover:bg-accent">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
          <button
            onClick={markAllRead}
            className="text-xs text-muted-foreground hover:text-foreground"
            disabled={unread === 0}
          >
            Marcar todas como lidas
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem notificações.</p>
          )}
          {items.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <button
                key={n.id}
                onClick={() => onClick(n)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-accent/50 last:border-0",
                  !n.read && "bg-primary/5",
                )}
              >
                <span className={cn("mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md", colorFor(n.type))}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm leading-tight", !n.read && "font-semibold")}>{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.desc}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{n.time}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
        <div className="border-t border-border p-2">
          <Link
            to={role === "admin" ? "/admin/notificacoes" : "/motorista/notificacoes"}
            className="block w-full rounded-md px-3 py-2 text-center text-xs font-medium text-primary hover:bg-accent"
          >
            Ver todas as notificações
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
