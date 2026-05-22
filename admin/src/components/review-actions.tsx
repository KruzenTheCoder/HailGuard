"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  approveProfile,
  approveVehicle,
  recommendProfile,
  recommendVehicle,
  rejectProfile,
  rejectVehicle,
  suspendVehicle,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Kind = "profile" | "vehicle";
type Mode = "idle" | "reject" | "suspend" | "recommend";

export type ReviewRecommendation = { recommendation: "approve" | "reject"; note: string | null };

export function ReviewActions({
  kind,
  id,
  status,
  canApprove = true,
  canReview = false,
  recommendation,
}: {
  kind: Kind;
  id: string;
  status: string;
  canApprove?: boolean;
  canReview?: boolean;
  recommendation?: ReviewRecommendation;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>, successMsg: string) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setMode("idle");
        setNote("");
        toast.success(successMsg);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Action failed.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  const positiveDone = kind === "profile" ? status === "approved" : status === "active";

  const recBanner = recommendation ? (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        recommendation.recommendation === "approve"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {recommendation.recommendation === "approve" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      <span>
        Reviewer recommends <strong>{recommendation.recommendation}</strong>
        {recommendation.note ? ` — ${recommendation.note}` : ""}
      </span>
    </div>
  ) : null;

  // --- Reviewer view: recommend only ---
  if (!canApprove && canReview) {
    return (
      <div className="flex flex-col gap-2">
        {recBanner}
        <Textarea
          placeholder="Recommendation note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  kind === "profile"
                    ? recommendProfile(id, "approve", note)
                    : recommendVehicle(id, "approve", note),
                "Recommendation recorded"
              )
            }
          >
            Recommend approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  kind === "profile"
                    ? recommendProfile(id, "reject", note)
                    : recommendVehicle(id, "reject", note),
                "Recommendation recorded"
              )
            }
          >
            Recommend reject
          </Button>
        </div>
      </div>
    );
  }

  // --- Read-only (no review/approve permission) ---
  if (!canApprove) {
    return recBanner ?? null;
  }

  // --- Compliance admin view: final sign-off ---
  if (mode === "reject" || mode === "suspend") {
    const isReject = mode === "reject";
    return (
      <div className="flex flex-col gap-2">
        {recBanner}
        <Textarea
          placeholder={isReject ? "Reason for rejection (required)" : "Reason for suspension"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                async () => {
                  if (isReject) {
                    await (kind === "profile" ? rejectProfile(id, note) : rejectVehicle(id, note));
                  } else {
                    await suspendVehicle(id, note);
                  }
                },
                isReject ? `${kind === "profile" ? "Profile" : "Vehicle"} rejected` : "Vehicle suspended"
              )
            }
          >
            {pending ? "Saving…" : isReject ? "Confirm rejection" : "Confirm suspension"}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setMode("idle")}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {recBanner}
      <div className="flex flex-wrap gap-2">
        {!positiveDone ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                kind === "profile" ? () => approveProfile(id) : () => approveVehicle(id),
                kind === "profile" ? "Profile approved" : "Vehicle approved & activated"
              )
            }
          >
            {pending ? "Saving…" : kind === "profile" ? "Approve" : "Approve & activate"}
          </Button>
        ) : null}

        {kind === "vehicle" && status === "active" ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setMode("suspend")}>
            Suspend
          </Button>
        ) : null}

        {status !== "rejected" ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setMode("reject")}>
            Reject
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
