import { cn } from "@/lib/utils";
import type { DeliveryStatus, DriverStatus, RouteStatus } from "@/lib/mock-data";

const map: Record<string, { label: string; cls: string }> = {
  // route
  em_andamento: { label: "Em andamento", cls: "bg-warning/15 text-warning border-warning/30" },
  atrasado: { label: "Atrasado", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  concluido: { label: "Concluído", cls: "bg-success/15 text-success border-success/30" },
  problema: { label: "Problema", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  // driver
  ativo: { label: "Ativo", cls: "bg-success/15 text-success border-success/30" },
  inativo: { label: "Inativo", cls: "bg-muted text-muted-foreground border-border" },
  em_rota: { label: "Em rota", cls: "bg-info/15 text-info border-info/30" },
  disponivel: { label: "Disponível", cls: "bg-success/15 text-success border-success/30" },
  // delivery
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning border-warning/30" },
  entregue: { label: "Entregue", cls: "bg-success/15 text-success border-success/30" },
  tentativa: { label: "Tentativa", cls: "bg-warning/15 text-warning border-warning/30" },
  devolvido: { label: "Devolvido", cls: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status }: { status: RouteStatus | DriverStatus | DeliveryStatus }) {
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", m.cls)}>
      {m.label}
    </span>
  );
}
