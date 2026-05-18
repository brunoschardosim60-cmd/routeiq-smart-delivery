import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Building2, Fuel, Wallet, Receipt } from "lucide-react";
import { brl } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/empresas")({
  component: EmpresasPage,
});

function EmpresasPage() {
  const { company } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Empresa</h1>
        <p className="text-sm text-muted-foreground">
          Custos consolidados: combustível + pagamento dos motoristas.
        </p>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {company?.name ?? "—"}
            </span>
            <Badge variant="outline">0 motoristas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Pagamento motoristas" value={brl(0)} icon={<Wallet className="h-4 w-4" />} />
            <Mini label="Combustível" value={brl(0)} icon={<Fuel className="h-4 w-4" />} />
          </div>
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold text-primary">{brl(0)}</p>
            </div>
            <Receipt className="h-8 w-8 text-primary/60" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard label="Total motoristas" value={brl(0)} icon={<Wallet className="h-5 w-5" />} accent="info" />
        <MetricCard label="Total combustível" value={brl(0)} icon={<Fuel className="h-5 w-5" />} accent="warning" />
        <MetricCard label="Total geral" value={brl(0)} icon={<Receipt className="h-5 w-5" />} accent="success" />
      </div>
    </div>
  );
}

function Mini({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card/50 p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
