import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatZAR, getDashboardMetrics } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const m = await getDashboardMetrics();

  const metrics = [
    { label: "Active drivers", value: String(m.activeDrivers), hint: "Approved & operating" },
    {
      label: "Pending applications",
      value: String(m.pendingApplications),
      hint: "Profiles + vehicles awaiting review",
    },
    { label: "Revenue collected", value: formatZAR(m.revenueCollected), hint: "Succeeded payments" },
    { label: "Active zones", value: String(m.activeZones), hint: "Accepting subscriptions" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Compliance overview across all zones.">
        <Link href="/admin/applications">
          <Button variant="outline">Review queue</Button>
        </Link>
      </PageHeader>
      <div className="p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
