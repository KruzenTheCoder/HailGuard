import {
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  CircleX,
  Map as MapIcon,
  PauseCircle,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";

import type { ActivityRow } from "@/lib/queries";
import { formatRelative } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

type ActionMeta = {
  icon: LucideIcon;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  label: (row: ActivityRow) => string;
};

const ACTIONS: Record<string, ActionMeta> = {
  "profile.approve": {
    icon: CheckCircle2,
    tone: "success",
    label: () => "Driver profile approved",
  },
  "profile.reject": {
    icon: CircleX,
    tone: "danger",
    label: () => "Driver profile rejected",
  },
  "vehicle.approve": {
    icon: CheckCircle2,
    tone: "success",
    label: () => "Vehicle approved",
  },
  "vehicle.reject": {
    icon: CircleX,
    tone: "danger",
    label: () => "Vehicle rejected",
  },
  "vehicle.suspend": {
    icon: PauseCircle,
    tone: "warning",
    label: () => "Vehicle suspended",
  },
  "subscription.cancel": {
    icon: CircleDollarSign,
    tone: "warning",
    label: () => "Subscription cancelled",
  },
  "zone.create": {
    icon: PlusCircle,
    tone: "info",
    label: (row) => {
      const name = typeof row.detail.name === "string" ? row.detail.name : "Zone";
      return `Created zone "${name}"`;
    },
  },
  "zone.set_active": {
    icon: MapIcon,
    tone: "info",
    label: (row) => {
      const active = !!row.detail.isActive;
      return active ? "Zone activated" : "Zone deactivated";
    },
  },
};

const TONE_CLASS: Record<ActionMeta["tone"], { bubble: string; icon: string }> = {
  success: { bubble: "bg-emerald-50", icon: "text-emerald-600" },
  warning: { bubble: "bg-amber-50", icon: "text-amber-600" },
  danger: { bubble: "bg-red-50", icon: "text-red-600" },
  info: { bubble: "bg-sky-50", icon: "text-sky-600" },
  neutral: { bubble: "bg-muted", icon: "text-muted-foreground" },
};

function meta(row: ActivityRow): { icon: LucideIcon; tone: ActionMeta["tone"]; label: string } {
  const entry = ACTIONS[row.action];
  if (entry) return { icon: entry.icon, tone: entry.tone, label: entry.label(row) };
  return { icon: CircleAlert, tone: "neutral", label: row.action.replace(/[._]/g, " ") };
}

export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <header className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Recent activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Latest admin actions across the fleet
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No activity yet. Approvals, rejections and zone changes will show up here.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const m = meta(row);
            const Icon = m.icon;
            const tone = TONE_CLASS[m.tone];
            return (
              <li key={row.id} className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    tone.bubble,
                    tone.icon,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{m.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    by {row.actorName}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground" dateTime={row.createdAt}>
                  {formatRelative(row.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
