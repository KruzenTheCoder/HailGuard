"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { assignApplication } from "@/app/admin/actions";

export function AssignControl({
  entityType,
  entityId,
  reviewers,
  currentReviewerId,
}: {
  entityType: "driver_profile" | "vehicle";
  entityId: string;
  reviewers: { id: string; name: string }[];
  currentReviewerId?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentReviewerId ?? ""}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          try {
            await assignApplication(entityType, entityId, e.target.value || null);
            toast.success(e.target.value ? "Assigned to reviewer" : "Assignment cleared");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not assign");
          }
        })
      }
      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {reviewers.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
