const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const STEPS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365 * 86_400_000 },
  { unit: "month", ms: 30 * 86_400_000 },
  { unit: "week", ms: 7 * 86_400_000 },
  { unit: "day", ms: 86_400_000 },
  { unit: "hour", ms: 3_600_000 },
  { unit: "minute", ms: 60_000 },
  { unit: "second", ms: 1_000 },
];

export function formatRelative(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = t - now;
  const abs = Math.abs(diff);
  for (const step of STEPS) {
    if (abs >= step.ms || step.unit === "second") {
      return RTF.format(Math.round(diff / step.ms), step.unit);
    }
  }
  return "just now";
}
