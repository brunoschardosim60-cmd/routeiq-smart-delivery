import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ReactNode } from "react";

export interface MetricTrend {
  value: number; // percentage diff
  label?: string; // e.g. "vs ontem"
}

export function MetricCard({
  label, value, icon, accent = "default", hint, trend, loading,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "default" | "success" | "warning" | "destructive" | "info";
  hint?: string;
  trend?: MetricTrend;
  loading?: boolean;
}) {
  const accentMap: Record<string, string> = {
    default: "bg-accent/40 text-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  };
  const trendDir = trend ? (trend.value > 0 ? "up" : trend.value < 0 ? "down" : "flat") : null;
  const trendColor =
    trendDir === "up" ? "text-success bg-success/10"
    : trendDir === "down" ? "text-destructive bg-destructive/10"
    : "text-muted-foreground bg-muted";
  const TrendIcon = trendDir === "up" ? ArrowUp : trendDir === "down" ? ArrowDown : Minus;
  return (
    <Card className="overflow-hidden transition-colors hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight truncate">{value}</p>
            )}
            {trend && !loading && (
              <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {Math.abs(trend.value).toFixed(0)}%
                {trend.label && <span className="text-muted-foreground font-normal ml-0.5">{trend.label}</span>}
              </span>
            )}
            {hint && !trend && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          {icon && (
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", accentMap[accent])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
