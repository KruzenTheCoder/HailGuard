import { PageHeader } from "@/components/page-header";
import { getIncidents } from "@/lib/incident-queries";
import { requirePermission } from "@/lib/permissions";
import { getDrivers, getSubscriptions } from "@/lib/queries";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission("audit:read");

  const [incidents, drivers, subscriptions] = await Promise.all([
    getIncidents(),
    getDrivers(),
    getSubscriptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Reports & Analytics Workspace"
        description="Interactive visual reporting for safety incidents, fleet drivers, and zone compliance. Apply filters and export executive PDF reports."
      />
      <ReportsClient
        initialIncidents={incidents}
        initialDrivers={drivers}
        initialSubscriptions={subscriptions}
      />
    </>
  );
}
