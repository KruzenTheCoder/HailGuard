import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDrivers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const drivers = await getDrivers();

  return (
    <>
      <PageHeader title="Drivers" description="All registered drivers and their compliance status." />
      <div className="p-8">
        <Card>
          <CardContent className="p-0">
            {drivers.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No drivers have registered yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map(({ profile, user, vehicleCount }) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {user?.full_name || "Unnamed driver"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user?.email || user?.phone_number || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{vehicleCount}</TableCell>
                      <TableCell>
                        <StatusBadge status={profile.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/drivers/${profile.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
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
