import {
  CheckCircle2,
  Clock,
  ShieldOff,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { formatZAR, getVerifyPass, type VerifyPassResult } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Verify Zone Pass — HailGuard",
  description: "Public verification of a HailGuard digital Zone Pass.",
};

type Verdict = {
  level: "valid" | "warning" | "invalid";
  icon: LucideIcon;
  headline: string;
  detail: string;
};

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function verdictFor(pass: VerifyPassResult | null): Verdict {
  if (!pass) {
    return {
      level: "invalid",
      icon: ShieldOff,
      headline: "Pass not found",
      detail:
        "This QR code does not match any HailGuard subscription. Ask the driver to refresh their pass and try again.",
    };
  }
  const days = daysUntil(pass.endDate);
  if (pass.status === "cancelled") {
    return {
      level: "invalid",
      icon: XCircle,
      headline: "Pass cancelled",
      detail: "This subscription has been cancelled and is no longer valid.",
    };
  }
  if (pass.status === "expired" || (days !== null && days < 0)) {
    return {
      level: "invalid",
      icon: XCircle,
      headline: "Pass expired",
      detail:
        days !== null && days < 0
          ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago.`
          : "This subscription has expired.",
    };
  }
  if (pass.status === "pending_payment") {
    return {
      level: "warning",
      icon: TriangleAlert,
      headline: "Payment outstanding",
      detail: "The driver has registered but the subscription payment has not cleared yet.",
    };
  }
  if (pass.status === "active") {
    if (days !== null && days <= 7) {
      return {
        level: "warning",
        icon: Clock,
        headline: "Compliant — renew soon",
        detail: `Active subscription expiring in ${days} day${days === 1 ? "" : "s"}.`,
      };
    }
    return {
      level: "valid",
      icon: CheckCircle2,
      headline: "Compliant",
      detail: "Active Zone Pass in good standing.",
    };
  }
  return {
    level: "invalid",
    icon: ShieldOff,
    headline: "Unknown status",
    detail: "This pass returned an unexpected state. Treat as not verified.",
  };
}

const LEVEL_STYLES: Record<Verdict["level"], { bg: string; ring: string; icon: string; pill: "success" | "warning" | "danger" }> = {
  valid: {
    bg: "from-emerald-50 to-white",
    ring: "ring-emerald-200",
    icon: "bg-emerald-100 text-emerald-700",
    pill: "success",
  },
  warning: {
    bg: "from-amber-50 to-white",
    ring: "ring-amber-200",
    icon: "bg-amber-100 text-amber-700",
    pill: "warning",
  },
  invalid: {
    bg: "from-red-50 to-white",
    ring: "ring-red-200",
    icon: "bg-red-100 text-red-700",
    pill: "danger",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function VerifyPassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pass = await getVerifyPass(id);
  const verdict = verdictFor(pass);
  const palette = LEVEL_STYLES[verdict.level];
  const Icon = verdict.icon;

  return (
    <main className="min-h-screen bg-muted/40 p-4 sm:p-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="flex items-center justify-between">
          <BrandLogo height={36} />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Zone Pass · Verify
          </span>
        </header>

        <section
          className={cn(
            "overflow-hidden rounded-2xl border bg-gradient-to-b shadow-lg ring-1",
            palette.bg,
            palette.ring,
          )}
        >
          <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center">
            <span
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                palette.icon,
              )}
            >
              <Icon className="h-8 w-8" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {verdict.level === "valid"
                ? "Verified"
                : verdict.level === "warning"
                  ? "Caution"
                  : "Not verified"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{verdict.headline}</h1>
            <p className="max-w-xs text-sm text-muted-foreground">{verdict.detail}</p>
          </div>

          {pass ? (
            <div className="mx-6 mt-6 rounded-xl border border-border bg-background/80 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Operating zone
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tracking-tight">{pass.zone.name}</p>
                </div>
                <Badge tone={palette.pill}>
                  {pass.status === "active" ? "Active" : pass.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <Field label="Driver" value={pass.driver.displayName} />
                <Field
                  label="Plan"
                  value={pass.planType === "monthly" ? "Monthly pass" : "Yearly pass"}
                />
                <Field
                  label="Vehicle"
                  value={`${pass.vehicle.make} ${pass.vehicle.model} (${pass.vehicle.year})`}
                />
                <Field label="Plate" value={pass.vehicle.licensePlate} mono />
                <Field label="Valid from" value={formatDate(pass.startDate)} />
                <Field label="Valid until" value={formatDate(pass.endDate)} />
              </div>
            </div>
          ) : (
            <div className="mx-6 mt-6 rounded-xl border border-dashed border-border bg-background/80 p-5 text-center text-sm text-muted-foreground">
              Reference: <code className="font-mono text-xs">{id}</code>
            </div>
          )}

          <footer className="mt-6 flex flex-col items-center gap-1 border-t border-border/60 bg-background/60 px-6 py-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Checked at
            </p>
            <p className="text-sm font-medium">
              {formatDateTime(pass?.verifiedAt ?? new Date().toISOString())}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              HailGuard verifies passes against the live compliance register.
            </p>
          </footer>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Tampering with or fabricating a Zone Pass is an offence. Verifications are logged.
        </p>
      </div>
    </main>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium",
          mono && "font-mono tracking-wider",
        )}
      >
        {value}
      </p>
    </div>
  );
}
