import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

import { Sparkline } from "@/components/sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Trend = {
  /** Raw delta (positive = up). */
  delta: number;
  /** Display label for the delta — e.g. "+4 vs 7d ago" or "+12%". */
  label: string;
  /** Whether an upward delta is good (true) or bad (false). */
  goodWhenUp?: boolean;
};

export type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  /** Accent color for icon bubble + sparkline. */
  accent?: "emerald" | "sky" | "amber" | "violet";
  series?: number[];
  trend?: Trend;
};

const ACCENTS: Record<
  NonNullable<MetricCardProps["accent"]>,
  { stroke: string; bubble: string; icon: string }
> = {
  emerald: { stroke: "#16BE66", bubble: "bg-emerald-50", icon: "text-emerald-600" },
  sky: { stroke: "#0EA5E9", bubble: "bg-sky-50", icon: "text-sky-600" },
  amber: { stroke: "#F59E0B", bubble: "bg-amber-50", icon: "text-amber-600" },
  violet: { stroke: "#8B5CF6", bubble: "bg-violet-50", icon: "text-violet-600" },
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "emerald",
  series,
  trend,
}: MetricCardProps) {
  const palette = ACCENTS[accent];

  const trendIsGood = trend
    ? trend.delta === 0
      ? null
      : trend.goodWhenUp === false
        ? trend.delta < 0
        : trend.delta > 0
    : null;
  const TrendIcon =
    trend === undefined || trend.delta === 0
      ? Minus
      : trend.delta > 0
        ? ArrowUpRight
        : ArrowDownRight;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  palette.bubble,
                  palette.icon
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trendIsGood === null
                  ? "bg-muted text-muted-foreground"
                  : trendIsGood
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {trend.label}
            </span>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          {series && series.length > 0 ? (
            <Sparkline data={series} color={palette.stroke} ariaLabel={`${label} trend`} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
