import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Route as RouteIcon, DollarSign, Fuel, FileBarChart,
  Settings, LogOut, Truck, Home, Wallet, History, Bell, Link2, Building2, ListChecks,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, MapPin,
} from "lucide-react";
import { logout, type Role } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useCurrentCompany } from "@/lib/current-company";

// ─── Itens admin agrupados ────────────────────────────────────────────────────
const adminGroups = [
  {
    label: "Operação",
    items: [
      { to: "/admin/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
      { to: "/admin/rotas",      label: "Rotas",       icon: RouteIcon },
      { to: "/admin/heatmap",      label: "Heatmap",      icon: RouteIcon },
      { to: "/admin/rastreamento", label: "Rastreamento", icon: MapPin },
      { to: "/admin/motoristas",   label: "Motoristas",   icon: Users },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/admin/clientes",   label: "Empresas Clientes", icon: Building2 },
      { to: "/admin/pagamentos", label: "Pagamentos",  icon: Wallet },
      { to: "/admin/combustivel",label: "Combustível", icon: Fuel },
      { to: "/admin/metas",      label: "Metas",       icon: FileBarChart },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/relatorios",    label: "Relatórios",         icon: FileBarChart },
      { to: "/admin/financeiro",    label: "Financeiro",          icon: DollarSign },
      { to: "/admin/empresas",      label: "Empresas",            icon: Building2 },
      { to: "/admin/comprovei",     label: "Conexões Comprovei",  icon: Link2 },
      { to: "/admin/sync-logs",     label: "Logs de Sync",        icon: ListChecks },
      { to: "/admin/notificacoes",  label: "Notificações",        icon: Bell },
      { to: "/admin/configuracoes", label: "Configurações",       icon: Settings },
    ],
  },
];

// ─── Itens motorista agrupados ────────────────────────────────────────────────
const driverGroups = [
  {
    label: "Operação",
    items: [
      { to: "/motorista/dashboard", label: "Início",       icon: Home },
      { to: "/motorista/rotas",     label: "Minhas Rotas", icon: RouteIcon },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/motorista/financeiro",  label: "Meu Financeiro", icon: Wallet },
      { to: "/motorista/combustivel", label: "Combustível",     icon: Fuel },
      { to: "/motorista/historico",   label: "Meu Histórico",  icon: History },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/motorista/perfil",       label: "Meu Perfil",         icon: Settings },
      { to: "/motorista/notificacoes", label: "Notificações",       icon: Bell },
      { to: "/motorista/comprovei",    label: "Conectar Comprovei", icon: Link2 },
    ],
  },
];

// ─── Grupo colapsável ─────────────────────────────────────────────────────────
function NavGroup({
  label,
  items,
  path,
  collapsed: sidebarCollapsed,
}: {
  label: string;
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  path: string;
  collapsed: boolean;
}) {
  const hasActive = items.some((it) => path === it.to || path.startsWith(it.to + "/"));
  const [open, setOpen] = useState(hasActive || label === "Operação");

  return (
    <div className="mb-1">
      {/* Cabeçalho do grupo — oculto quando sidebar colapsada */}
      {!sidebarCollapsed && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          {label}
          {open
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
        </button>
      )}

      {/* Linha divisória quando sidebar colapsada */}
      {sidebarCollapsed && (
        <div className="mx-3 my-2 border-t border-sidebar-border/50" />
      )}

      {/* Itens — sempre visíveis quando sidebar colapsada */}
      {(open || sidebarCollapsed) && (
        <div className="space-y-0.5">
          {items.map((it) => {
            const active = path === it.to || path.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                title={sidebarCollapsed ? it.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  sidebarCollapsed && "justify-center px-2",
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{it.label}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar principal ────────────────────────────────────────────────────────
export function Sidebar({ role }: { role: Role }) {
  const groups = role === "admin" ? adminGroups : driverGroups;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [companyScope] = useCurrentCompany();
  const company = companyScope ? { name: companyScope === "todas" ? "Todas" : companyScope } : null;
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-14" : "w-60",
      )}
    >
      {/* Logo + toggle */}
      <div className={cn(
        "flex h-16 items-center border-b border-sidebar-border px-3",
        collapsed ? "justify-center" : "gap-2 px-4 justify-between",
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">RouteIQ</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                {role === "admin" ? "Administrador" : "Motorista"}
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-4 w-4" />
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            collapsed && "hidden",
          )}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Botão de expand quando colapsada */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir menu"
          className="mx-auto mt-2 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {/* Tag da empresa — só aparece expandida */}
      {!collapsed && company?.name && (
        <div className="mx-3 mt-3 mb-1 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 px-2.5 py-1.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Empresa</p>
          <p className="text-xs font-medium text-sidebar-foreground truncate">{company.name}</p>
        </div>
      )}

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto p-2 pt-3">
        {groups.map((g) => (
          <NavGroup
            key={g.label}
            label={g.label}
            items={g.items}
            path={path}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={handleLogout}
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
