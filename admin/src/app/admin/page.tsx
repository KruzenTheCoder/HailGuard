import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

import { ActivityFeed } from "@/components/activity-feed";
import { ComplianceMap } from "@/components/compliance-map";
import { DriverVehicleTable } from "@/components/driver-vehicle-table";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  getDashboardMetrics,
  getDriverVehicleStatus,
  getRecentActivity,
  getZoneFleetSummary,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Convert a cumulative series into a daily-delta series for histogram display.
 * Bar charts read better as deltas-per-day than as a slowly-rising line.
 */
function toDaily(cumulative: number[]): number[] {
  if (cumulative.length === 0) return [];
  const out: number[] = [cumulative[0]];
  for (let i = 1; i < cumulative.length; i++) {
    out.push(Math.max(0, cumulative[i] - cumulative[i - 1]));
  }
  return out;
}

export default async function DashboardPage() {
  const [m, fleet, activity, zoneFleet] = await Promise.all([
    getDashboardMetrics(),
    getDriverVehicleStatus(),
    getRecentActivity(12),
    getZoneFleetSummary(),
  ]);

  // Bar-chart series. Compliance % is already daily; the cumulative drivers /
  // vehicles series get converted to per-day deltas so the bars read as
  // "growth per day" instead of a barely-changing line.
  const complianceSeries = m.series.compliance;
  const driverSeries = toDaily(m.series.approvedDrivers);
  const vehicleSeries = toDaily(m.series.activeVehicles);
  const pendingSeries = m.series.newPending;

  return (
    <>
      <PageHeader title="Dashboard" description="Compliance overview across all zones.">
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
            hint={`${m.activeDrivers}/${m.totalDrivers} drivers approved`}
            accent="emerald-solid"
            series={complianceSeries}
          />
          <MetricCard
            label="Total drivers"
            value={m.totalDrivers.toLocaleString("en-ZA")}
            hint={`${m.activeDrivers} active`}
            accent="emerald"
            series={driverSeries}
          />
          <MetricCard
            label="Total vehicles"
            value={m.totalVehicles.toLocaleString("en-ZA")}
            hint={`${m.activeVehicles} active · ${m.activeSubscriptions} subscribed`}
            accent="navy"
            series={vehicleSeries}
          />
          <MetricCard
            label="Pending verifications"
            value={m.pendingApplications.toLocaleString("en-ZA")}
            hint={`${m.pendingProfiles} profiles · ${m.pendingVehicles} vehicles`}
            accent="rose"
            series={pendingSeries}
          />
        </div>

        <ComplianceMap zones={zoneFleet} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
          <DriverVehicleTable rows={fleet} />
          <ActivityFeed rows={activity} />
        </div>
      </div>
    </>
  );
}
