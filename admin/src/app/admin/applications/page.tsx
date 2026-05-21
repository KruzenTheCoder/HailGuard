import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPendingProfiles, getPendingVehicles } from "@/lib/queries";

export const dynamic = "force-dynamic";

function displayName(user: { full_name: string | null; email: string | null; phone_number: string | null } | null) {
  return user?.full_name || user?.email || user?.phone_number || "Unknown driver";
}

export default async function ApplicationsPage() {
  const [profiles, vehicles] = await Promise.all([getPendingProfiles(), getPendingVehicles()]);

  return (
    <>
      <PageHeader title="Applications" description="Drivers and vehicles awaiting verification." />
      <div className="flex flex-col gap-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Driver profiles awaiting review ({profiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {profiles.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No pending profiles.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>ID number</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(({ profile, user }) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{displayName(user)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile.idNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(profile.createdAt).toLocaleDateString("en-ZA")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/drivers/${profile.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Review
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Vehicles awaiting review ({vehicles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vehicles.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No pending vehicles.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map(({ vehicle, user }) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        {vehicle.make} {vehicle.model} ({vehicle.year})
                      </TableCell>
                      <TableCell className="text-muted-foreground">{vehicle.licensePlate}</TableCell>
                      <TableCell className="text-muted-foreground">{displayName(user)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/drivers/${vehicle.driverId}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Review
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
