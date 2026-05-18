import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

export function MetricCard({
  label, value, icon, accent = "default", hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "default" | "success" | "warning" | "destructive" | "info";
  hint?: string;
}) {
  const accentMap: Record<string, string> = {
    default: "bg-accent/40 text-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          {icon && (
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", accentMap[accent])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
