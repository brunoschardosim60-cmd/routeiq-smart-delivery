import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/admin")({
  component: () => <AppShell requireRole="admin" />,
});
