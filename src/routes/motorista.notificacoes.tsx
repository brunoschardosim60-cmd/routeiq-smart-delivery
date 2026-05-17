import { createFileRoute } from "@tanstack/react-router";
import { NotificationsList } from "./admin.notificacoes";

export const Route = createFileRoute("/motorista/notificacoes")({
  component: () => <NotificationsList audience="motorista" />,
});
