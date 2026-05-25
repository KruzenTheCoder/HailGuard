import { capacityQualification, type EHailingPlatform } from "@hailguard/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DocumentThumb } from "@/components/document-thumb";
import { PageHeader } from "@/components/page-header";
import { PrdpReviewActions } from "@/components/prdp-review-actions";
import { ReviewActions } from "@/components/review-actions";
import { RevokeComplianceButton } from "@/components/revoke-compliance-button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyAssignedEntityIds } from "@/lib/assignment-queries";
import { BUCKETS, signedUrl } from "@/lib/documents";
import { getMyPermissions, requirePermission } from "@/lib/permissions";
import { getDriverDetail } from "@/lib/queries";
import { getRecommendations } from "@/lib/recommendation-queries";

export const dynamic = "force-dynamic";

const PLATFORM_LABELS: Record<EHailingPlatform, string> = {
  uber: "Uber",
  bolt: "Bolt",
  indrive: "InDrive",
};

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("application:review");
  const { id } = await params;
  const detail = await getDriverDetail(id);
  if (!detail) notFound();

  const { profile, user, vehicles } = detail;

  const [perms, recommendations] = await Promise.all([
    getMyPermissions(),
    getRecommendations([profile.id, ...vehicles.map((v) => v.id)]),
  ]);
  const canApprove = perms.has("application:approve");
  const canReview = perms.has("application:review");
  const canRevoke = perms.has("compliance:revoke");

  // Reviewers may only open drivers with an application assigned to them.
  const reviewerOnly = canReview && !canApprove && !perms.has("application:assign");
  if (reviewerOnly) {
    const assigned = await getMyAssignedEntityIds();
    const hasAssignment = assigned.has(profile.id) || vehicles.some((v) => assigned.has(v.id));
    if (!hasAssignment) redirect("/admin/applications");
  }

  const [idUrl, licenseUrl, prdpUrl] = await Promise.all([
    signedUrl(BUCKETS.driver, profile.idDocumentPath),
    signedUrl(BUCKETS.driver, profile.licenseDocumentPath),
    signedUrl(BUCKETS.driver, profile.prdpDocumentPath),
  ]);

  const platformEntries = await Promise.all(
    (Object.entries(profile.platformVerifications) as [EHailingPlatform, { status: string; proofPath?: string }][]).map(
      async ([platform, v]) => ({
        platform,
        status: v.status,
        url: await signedUrl(BUCKETS.driver, v.proofPath ?? null),
      })
    )
  );

  const vehicleCards = await Promise.all(
    vehicles.map(async (vehicle) => ({
      vehicle,
      regUrl: await signedUrl(BUCKETS.vehicle, vehicle.registrationDocumentPath),
      rwUrl: await signedUrl(BUCKETS.vehicle, vehicle.roadworthyCertificatePath),
    }))
  );

  const driverName = user?.full_name || user?.email || user?.phone_number || "Driver";

  return (
    <>
      <PageHeader title={driverName} description={user?.email ?? user?.phone_number ?? undefined}>
        <StatusBadge status={profile.status} />
        {canRevoke ? <RevokeComplianceButton driverId={profile.id} /> : null}
      </PageHeader>

      <div className="flex flex-col gap-6 p-8">
        <Link
          href="/admin/applications"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Driver profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="ID number" value={profile.idNumber} />
              <Field label="Licence number" value={profile.licenseNumber} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DocumentThumb label="ID document" url={idUrl} />
              <DocumentThumb label="Driver's licence" url={licenseUrl} />
            </div>
            {profile.reviewNote ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Note:</span> {profile.reviewNote}
              </p>
            ) : null}
            <ReviewActions
              kind="profile"
              id={profile.id}
              status={profile.status}
              canApprove={canApprove}
              canReview={canReview}
              recommendation={recommendations[profile.id]}
            />
          </CardContent>
        </Card>

        {/* Professional Driving Permit (PrDP) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Professional Driving Permit (PrDP)</CardTitle>
            <StatusBadge status={profile.prdpStatus} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!profile.prdpNumber ? (
              <p className="text-sm text-muted-foreground py-2 text-center">No PrDP permit details submitted yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Field label="PrDP number" value={profile.prdpNumber} />
                  <Field label="Expiry date" value={profile.prdpExpiresAt} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DocumentThumb label="PrDP Permit" url={prdpUrl} />
                </div>
                <PrdpReviewActions
                  profileId={profile.id}
                  prdpStatus={profile.prdpStatus}
                  canReview={canReview || canApprove}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Platform verification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform verification</CardTitle>
          </CardHeader>
          <CardContent>
            {platformEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No platform proof submitted.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {platformEntries.map((entry) => (
                  <div key={entry.platform} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{PLATFORM_LABELS[entry.platform]}</span>
                      <StatusBadge status={entry.status} />
                    </div>
                    <DocumentThumb label="Proof" url={entry.url} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicles */}
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Vehicles ({vehicles.length})</h2>
          {vehicleCards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No vehicles registered.
              </CardContent>
            </Card>
          ) : (
            vehicleCards.map(({ vehicle, regUrl, rwUrl }) => (
              <Card key={vehicle.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    {vehicle.make} {vehicle.model} · {vehicle.licensePlate}
                  </CardTitle>
                  <StatusBadge status={vehicle.status} />
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <Field label="Year" value={String(vehicle.year)} />
                    <Field label="Capacity" value={vehicle.passengerCapacity != null ? `${vehicle.passengerCapacity} pax` : null} />
                    <Field label="Category" value={vehicle.vehicleCategory} />
                    <Field label="Roadworthy expiry" value={vehicle.roadworthyExpiresAt} />
                  </div>
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">
                      Compliance restriction · max{" "}
                      {vehicle.passengerCapacity != null ? `${vehicle.passengerCapacity} passengers` : "— passengers"}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      {capacityQualification(vehicle.passengerCapacity)}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DocumentThumb label="Registration" url={regUrl} />
                    <DocumentThumb label="Roadworthy certificate" url={rwUrl} />
                  </div>
                  {vehicle.reviewNote ? (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Note:</span> {vehicle.reviewNote}
                    </p>
                  ) : null}
                  <ReviewActions
                    kind="vehicle"
                    id={vehicle.id}
                    status={vehicle.status}
                    canApprove={canApprove}
                    canReview={canReview}
                    recommendation={recommendations[vehicle.id]}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value || "—"}</p>
    </div>
  );
}
