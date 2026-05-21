import { CancelSubscriptionButton } from "@/components/cancel-subscription-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatZAR, getSubscriptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const subscriptions = await getSubscriptions();

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Active, expired and pending zone subscriptions."
      />
      <div className="p-8">
        <Card>
          <CardContent className="p-0">
            {subscriptions.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No subscriptions yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Valid until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.driverName}</TableCell>
                      <TableCell className="text-muted-foreground">{s.vehicleLabel}</TableCell>
                      <TableCell>{s.zoneName}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{s.planType}</TableCell>
                      <TableCell>{formatZAR(s.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.endDate ? new Date(s.endDate).toLocaleDateString("en-ZA") : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {s.status === "active" || s.status === "pending_payment" ? (
                          <div className="flex justify-end">
                            <CancelSubscriptionButton id={s.id} />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
