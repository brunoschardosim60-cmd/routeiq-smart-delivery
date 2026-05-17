import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsBell } from "./NotificationsBell";
import { ComproveiSyncIndicator } from "./ComproveiSyncIndicator";
import { useAuth, type Role } from "@/hooks/use-auth";
import { useDbAssignedRoutes } from "@/lib/routes-db";
import { todayISO } from "@/lib/format";

const LABELS: Record<string, string> = {
  admin: "Admin",
  motorista: "Motorista",
  dashboard: "Dashboard",
  rotas: "Rotas",
  nova: "Nova",
  motoristas: "Motoristas",
  clientes: "Clientes",
  empresas: "Empresas",
  combustivel: "Combustível",
  comprovei: "Comprovei",
  pagamentos: "Pagamentos",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
  notificacoes: "Notificações",
  heatmap: "Heatmap",
  rastreamento: "Rastreamento",
  metas: "Metas",
  "sync-logs": "Logs de Sync",
  perfil: "Perfil",
  historico: "Histórico",
};

function prettify(seg: string) {
  if (LABELS[seg]) return LABELS[seg];
  // hide route ids / uuids
  if (/^[0-9a-f-]{8,}$/i.test(seg)) return "Detalhes";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function Header({ role }: { role: Role }) {
  const { user, company } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { rows } = useDbAssignedRoutes();

  const segments = useMemo(() => path.split("/").filter(Boolean), [path]);

  const activeToday = useMemo(() => {
    const t = todayISO();
    return rows.filter(
      (r) => r.dateISO === t && (r.status === "em_andamento" || r.status === "atrasado"),
    ).length;
  }, [rows]);

  const name = user?.full_name?.trim() || (role === "admin" ? "Administrador" : "Motorista");
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/40 px-6 backdrop-blur">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{company?.name ?? "RouteIQ"}</p>
        <nav className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
          {segments.length === 0 ? (
            <span>/</span>
          ) : (
            segments.map((seg, i) => {
              const href = "/" + segments.slice(0, i + 1).join("/");
              const isLast = i === segments.length - 1;
              return (
                <span key={href} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                  {isLast ? (
                    <span className="text-foreground">{prettify(seg)}</span>
                  ) : (
                    <Link to={href as never} className="hover:text-foreground transition-colors">{prettify(seg)}</Link>
                  )}
                </span>
              );
            })
          )}
          {role === "admin" && activeToday > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              {activeToday} ativa{activeToday > 1 ? "s" : ""} hoje
            </span>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {role === "admin" && <ComproveiSyncIndicator />}
        <NotificationsBell role={role} />
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="text-xs leading-tight">
            <p className="font-medium">{name}</p>
            <p className="text-muted-foreground">{role === "admin" ? "Administrador" : "Motorista"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
