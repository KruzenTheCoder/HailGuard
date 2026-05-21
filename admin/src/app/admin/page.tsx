import { Car, ClipboardCheck, ShieldCheck, Users, Wallet } from "lucide-react";
import Link from "next/link";

import { ActivityFeed } from "@/components/activity-feed";
import { ComplianceMap } from "@/components/compliance-map";
import { DriverVehicleTable } from "@/components/driver-vehicle-table";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatZAR,
  getDashboardMetrics,
  getDriverVehicleStatus,
  getRecentActivity,
  getZoneFleetSummary,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function sumSlice(series: number[], from: number, to: number): number {
  return series.slice(from, to).reduce((a, b) => a + b, 0);
}

export default async function DashboardPage() {
  const [m, fleet, activity, zoneFleet] = await Promise.all([
    getDashboardMetrics(),
    getDriverVehicleStatus(),
    getRecentActivity(12),
    getZoneFleetSummary(),
  ]);

  const len = m.series.compliance.length;

  // Trend deltas: compare the most-recent point to one taken ~7 days back.
  const compareIndex = Math.max(0, len - 8);
  const driverDelta = m.series.approvedDrivers[len - 1] - m.series.approvedDrivers[compareIndex];
  const vehicleDelta = m.series.activeVehicles[len - 1] - m.series.activeVehicles[compareIndex];
  const complianceDelta = m.series.compliance[len - 1] - m.series.compliance[compareIndex];

  // For "new pending" the series is per-day, so compare last-7 to prev-7.
  const last7Pending = sumSlice(m.series.newPending, Math.max(0, len - 7), len);
  const prev7Pending = sumSlice(m.series.newPending, Math.max(0, len - 14), Math.max(0, len - 7));
  const pendingDelta = last7Pending - prev7Pending;

  const last7Revenue = sumSlice(m.series.revenue, Math.max(0, len - 7), len);
  const prev7Revenue = sumSlice(m.series.revenue, Math.max(0, len - 14), Math.max(0, len - 7));
  const revenueDelta = last7Revenue - prev7Revenue;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Compliance overview across all zones."
      >
        <Link href="/admin/applications">
          <Button variant="outline">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Review queue
          </Button>
        </Link>
      </PageHeader>

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Overall fleet compliance"
            value={`${m.compliancePercent}%`}
            hint={`${m.activeDrivers} of ${m.totalDrivers} drivers approved`}
            icon={ShieldCheck}
            accent="emerald"
            series={m.series.compliance}
            trend={{
              delta: complianceDelta,
              label: `${complianceDelta >= 0 ? "+" : ""}${complianceDelta}pp vs 7d`,
              goodWhenUp: true,
            }}
          />
          <MetricCard
            label="Total drivers"
            value={m.totalDrivers.toLocaleString("en-ZA")}
            hint={`${m.activeDrivers} active`}
            icon={Users}
            accent="sky"
            series={m.series.approvedDrivers}
            trend={{
              delta: driverDelta,
              label: `${driverDelta >= 0 ? "+" : ""}${driverDelta} this week`,
              goodWhenUp: true,
            }}
          />
          <MetricCard
            label="Total vehicles"
            value={m.totalVehicles.toLocaleString("en-ZA")}
            hint={`${m.activeVehicles} active · ${m.activeSubscriptions} subscribed`}
            icon={Car}
            accent="violet"
            series={m.series.activeVehicles}
            trend={{
              delta: vehicleDelta,
              label: `${vehicleDelta >= 0 ? "+" : ""}${vehicleDelta} this week`,
              goodWhenUp: true,
            }}
          />
          <MetricCard
            label="Pending verifications"
            value={m.pendingApplications.toLocaleString("en-ZA")}
            hint={`${m.pendingProfiles} profiles · ${m.pendingVehicles} vehicles`}
            icon={ClipboardCheck}
            accent="amber"
            series={m.series.newPending}
            trend={{
              delta: pendingDelta,
              label: `${pendingDelta >= 0 ? "+" : ""}${pendingDelta} vs prev 7d`,
              // More incoming work is usually not "good" — flag upward as warning.
              goodWhenUp: false,
            }}
          />
        </div>

        <Card>
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Revenue collected (all-time)
                </p>
                <p className="text-2xl font-semibold tracking-tight">
                  {formatZAR(m.revenueCollected)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Last 7 days
              </p>
              <p className="text-lg font-semibold tracking-tight">{formatZAR(last7Revenue)}</p>
              <p
                className={
                  revenueDelta >= 0
                    ? "text-xs font-medium text-emerald-700"
                    : "text-xs font-medium text-red-700"
                }
              >
                {revenueDelta >= 0 ? "+" : ""}
                {formatZAR(revenueDelta)} vs prev 7d
              </p>
            </div>
          </CardContent>
        </Card>

        <ComplianceMap zones={zoneFleet} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
          <DriverVehicleTable rows={fleet} />
          <ActivityFeed rows={activity} />
        </div>
      </div>
    </>
  );
}
