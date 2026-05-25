import Link from "next/link";

import { AssignControl } from "@/components/assign-control";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAssignments,
  getMyAssignedEntityIds,
  getReviewers,
} from "@/lib/assignment-queries";
import { getMyPermissions, requirePermission } from "@/lib/permissions";
import { getPendingProfiles, getPendingVehicles } from "@/lib/queries";

export const dynamic = "force-dynamic";

function displayName(user: { full_name: string | null; email: string | null; phone_number: string | null } | null) {
  return user?.full_name || user?.email || user?.phone_number || "Unknown driver";
}

export default async function ApplicationsPage() {
  await requirePermission("application:review");

  const [perms, allProfiles, allVehicles, myAssigned] = await Promise.all([
    getMyPermissions(),
    getPendingProfiles(),
    getPendingVehicles(),
    getMyAssignedEntityIds(),
  ]);

  const canAssign = perms.has("application:assign");
  // Reviewers (review but not assign/approve) only see what's assigned to them.
  const reviewerOnly = !canAssign && !perms.has("application:approve");

  const profiles = reviewerOnly
    ? allProfiles.filter((p) => myAssigned.has(p.profile.id))
    : allProfiles;
  const vehicles = reviewerOnly
    ? allVehicles.filter((v) => myAssigned.has(v.vehicle.id))
    : allVehicles;

  const reviewers = canAssign ? await getReviewers() : [];
  const assignments = canAssign
    ? await getAssignments([
        ...profiles.map((p) => p.profile.id),
        ...vehicles.map((v) => v.vehicle.id),
      ])
    : {};

  return (
    <>
      <PageHeader
        title="Applications"
        description={
          reviewerOnly
            ? "Applications assigned to you for review."
            : "Drivers and vehicles awaiting verification. Assign items to reviewers."
        }
      />
      <div className="flex flex-col gap-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Driver profiles ({profiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {profiles.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                {reviewerOnly ? "Nothing assigned to you yet." : "No pending profiles."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>ID number</TableHead>
                    <TableHead>{canAssign ? "Assigned reviewer" : "Submitted"}</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(({ profile, user }) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{displayName(user)}</TableCell>
                      <TableCell className="text-muted-foreground">{profile.idNumber ?? "—"}</TableCell>
                      <TableCell>
                        {canAssign ? (
                          <AssignControl
                            entityType="driver_profile"
                            entityId={profile.id}
                            reviewers={reviewers}
                            currentReviewerId={assignments[profile.id]?.reviewerId}
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {new Date(profile.createdAt).toLocaleDateString("en-ZA")}
                          </span>
                        )}
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
            <CardTitle className="text-base">Vehicles ({vehicles.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vehicles.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                {reviewerOnly ? "Nothing assigned to you yet." : "No pending vehicles."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>{canAssign ? "Assigned reviewer" : "Driver"}</TableHead>
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
                      <TableCell>
                        {canAssign ? (
                          <AssignControl
                            entityType="vehicle"
                            entityId={vehicle.id}
                            reviewers={reviewers}
                            currentReviewerId={assignments[vehicle.id]?.reviewerId}
                          />
                        ) : (
                          <span className="text-muted-foreground">{displayName(user)}</span>
                        )}
                      </TableCell>
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

        {canAssign && reviewers.length === 0 ? (
          <Badge tone="warning">No reviewer accounts yet — create one under Team &amp; users.</Badge>
        ) : null}
      </div>
    </>
  );
}
