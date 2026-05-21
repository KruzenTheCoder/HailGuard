import type { IncidentType } from "@hailguard/shared";

import { IncidentActions } from "@/components/incident-actions";
import { PageHeader } from "@/components/page-header";
import { SweepButton } from "@/components/sweep-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getIncidents } from "@/lib/incident-queries";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<IncidentType, string> = {
  sos_triggered: "SOS / Panic",
  passenger_dispute: "Passenger dispute",
  accident: "Accident",
  compliance_violation: "Compliance violation",
};

function statusTone(status: string): "danger" | "warning" | "success" | "neutral" {
  if (status === "open") return "danger";
  if (status === "under_investigation") return "warning";
  if (status === "resolved") return "success";
  return "neutral";
}

export default async function IncidentsPage() {
  const incidents = await getIncidents();
  const openCount = incidents.filter((i) => i.status !== "resolved").length;

  return (
    <>
      <PageHeader
        title="Incident Command Center"
        description={`${openCount} open · ${incidents.length} total. SOS triggers and compliance violations surface here in real time.`}
      >
        <SweepButton />
      </PageHeader>

      <div className="flex flex-col gap-4 p-8">
        {incidents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No incidents reported.
            </CardContent>
          </Card>
        ) : (
          incidents.map((incident) => {
            const isSos = incident.incidentType === "sos_triggered";
            return (
              <Card
                key={incident.id}
                className={
                  isSos && incident.status !== "resolved" ? "border-destructive" : undefined
                }
              >
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{TYPE_LABEL[incident.incidentType]}</span>
                      <Badge tone={statusTone(incident.status)}>
                        {incident.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {incident.driverName}
                      {incident.vehicleLabel ? ` · ${incident.vehicleLabel}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(incident.createdAt).toLocaleString("en-ZA")}
                    </p>
                    {incident.notes ? (
                      <p className="text-sm">{incident.notes}</p>
                    ) : null}
                    {incident.resolutionNotes ? (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Resolution:</span>{" "}
                        {incident.resolutionNotes}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <IncidentActions id={incident.id} status={incident.status} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
