import { BarChart } from "@/components/bar-chart";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperationsAnalytics } from "@/lib/analytics-queries";
import { formatZAR, getDashboardMetrics } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [m, ops] = await Promise.all([getDashboardMetrics(), getOperationsAnalytics()]);

  const expiringTotal =
    ops.expiry.roadworthyExpiring + ops.expiry.prdpExpiring + ops.expiry.passExpiring;
  const expiredTotal =
    ops.expiry.roadworthyExpired + ops.expiry.prdpExpired + ops.expiry.passExpired;

  const incidentMax = Math.max(1, ...ops.incidents.byType.map((b) => b.count));
  const zoneMax = Math.max(1, ...ops.zoneDensity.map((z) => z.activeVehicles));

  return (
    <>
      <PageHeader title="Analytics" description="Operations, safety and fatigue trends across the fleet." />
      <div className="flex flex-col gap-6 p-8">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Open incidents"
            value={String(ops.incidents.open)}
            hint={`${ops.incidents.total} all-time`}
            accent="rose"
            series={ops.incidents.series30}
          />
          <MetricCard
            label="Active shifts now"
            value={String(ops.shifts.activeNow)}
            hint={`${ops.shifts.overLimitNow} over ${12}h limit`}
            accent="navy"
          />
          <MetricCard
            label="Expiring ≤ 30 days"
            value={String(expiringTotal)}
            hint={`${expiredTotal} already expired`}
            accent="amber"
          />
          <MetricCard
            label="Fleet compliance"
            value={`${m.compliancePercent}%`}
            hint="Approved drivers"
            accent="emerald-solid"
            series={m.series.compliance}
          />
        </div>

        {/* Revenue trend */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenue — last 30 days
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-2xl font-semibold tracking-tight">
                {formatZAR(m.revenueCollected)}
              </p>
              <BarChart data={m.series.revenue} width={480} height={88} ariaLabel="Daily revenue" />
            </CardContent>
          </Card>

          {/* Incidents by type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Incidents by type
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {ops.incidents.byType.map((b) => (
                <div key={b.type} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm">{b.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(b.count / incidentMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-medium">{b.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Expiry risk + zone density */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Compliance expiry risk
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <ExpiryStat label="Roadworthy" expiring={ops.expiry.roadworthyExpiring} expired={ops.expiry.roadworthyExpired} />
              <ExpiryStat label="PrDP" expiring={ops.expiry.prdpExpiring} expired={ops.expiry.prdpExpired} />
              <ExpiryStat label="Zone pass" expiring={ops.expiry.passExpiring} expired={ops.expiry.passExpired} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Zone density — active vehicles
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {ops.zoneDensity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active subscriptions yet.</p>
              ) : (
                ops.zoneDensity.map((z) => (
                  <div key={z.name} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm">{z.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(z.activeVehicles / zoneMax) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-medium">
                      {z.activeVehicles}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function ExpiryStat({
  label,
  expiring,
  expired,
}: {
  label: string;
  expiring: number;
  expired: number;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-amber-600">{expiring}</p>
      <p className="text-xs text-muted-foreground">expiring</p>
      <p className="mt-1 text-sm font-medium text-red-600">{expired} expired</p>
    </div>
  );
}
