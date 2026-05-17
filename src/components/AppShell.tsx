import { useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth, type Role } from "@/hooks/use-auth";
import { useRoutesRealtime } from "@/hooks/use-routes-realtime";
import { DriverRouteMode } from "./DriverRouteMode";

export function AppShell({ requireRole }: { requireRole: Role }) {
  const navigate = useNavigate();
  const { loading, isAuthenticated, role } = useAuth();
  useRoutesRealtime({ notifyOnFinish: requireRole === "admin" });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }
    if (role && role !== requireRole) {
      navigate({ to: role === "admin" ? "/admin/dashboard" : "/motorista/dashboard" });
    }
  }, [loading, isAuthenticated, role, requireRole, navigate]);

  if (loading || !role || role !== requireRole) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header role={role} />
        <main className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
      {role === "motorista" && <DriverRouteMode />}
    </div>
  );
}
