import { ThemeToggle } from "./ThemeToggle";
import { NotificationsBell } from "./NotificationsBell";
import { ComproveiSyncIndicator } from "./ComproveiSyncIndicator";
import { useAuth, type Role } from "@/hooks/use-auth";

export function Header({ role }: { role: Role }) {
  const { user, company } = useAuth();
  const name = user?.full_name?.trim() || (role === "admin" ? "Administrador" : "Motorista");
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/40 px-6 backdrop-blur">
      <div>
        <p className="text-sm text-muted-foreground">{company?.name ?? "RouteIQ"}</p>
        <p className="text-xs text-muted-foreground">Gestão Inteligente de Entregas</p>
      </div>
      <div className="flex items-center gap-3">
        {role === "admin" && <ComproveiSyncIndicator />}
        <NotificationsBell role={role} />
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
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
