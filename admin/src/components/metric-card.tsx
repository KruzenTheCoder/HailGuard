import { BarChart } from "@/components/bar-chart";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent = "emerald-solid" | "emerald" | "navy" | "amber" | "rose";

export type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: Accent;
  series?: number[];
};

const PALETTES: Record<
  Accent,
  {
    container: string;
    label: string;
    value: string;
    hint: string;
    bar: string;
    barMuted: string;
  }
> = {
  "emerald-solid": {
    container: "bg-emerald-500 text-white border-emerald-600",
    label: "text-white/80",
    value: "text-white",
    hint: "text-white/80",
    bar: "rgba(255,255,255,0.92)",
    barMuted: "rgba(255,255,255,0.45)",
  },
  emerald: {
    container: "bg-card text-card-foreground",
    label: "text-muted-foreground",
    value: "text-foreground",
    hint: "text-muted-foreground",
    bar: "#16BE66",
    barMuted: "rgba(22,190,102,0.32)",
  },
  navy: {
    container: "bg-card text-card-foreground",
    label: "text-muted-foreground",
    value: "text-foreground",
    hint: "text-muted-foreground",
    bar: "#0D2236",
    barMuted: "rgba(13,34,54,0.28)",
  },
  amber: {
    container: "bg-card text-card-foreground",
    label: "text-muted-foreground",
    value: "text-foreground",
    hint: "text-muted-foreground",
    bar: "#F59E0B",
    barMuted: "rgba(245,158,11,0.32)",
  },
  rose: {
    container: "bg-card text-card-foreground",
    label: "text-muted-foreground",
    value: "text-foreground",
    hint: "text-muted-foreground",
    bar: "#E5484D",
    barMuted: "rgba(229,72,77,0.32)",
  },
};

export function MetricCard({
  label,
  value,
  hint,
  accent = "emerald",
  series,
}: MetricCardProps) {
  const palette = PALETTES[accent];

  return (
    <Card className={cn("overflow-hidden border", palette.container)}>
      <CardContent className="flex flex-col gap-3 p-5">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.14em]",
            palette.label,
          )}
        >
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <p className={cn("text-3xl font-semibold tracking-tight", palette.value)}>
            {value}
          </p>
          {hint ? <p className={cn("text-xs", palette.hint)}>{hint}</p> : null}
        </div>
        {series && series.length > 0 ? (
          <div className="-mx-1 mt-1">
            <BarChart
              data={series}
              color={palette.bar}
              mutedColor={palette.barMuted}
              height={56}
              ariaLabel={`${label} trend`}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
