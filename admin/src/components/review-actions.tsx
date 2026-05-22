"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  approveProfile,
  approveVehicle,
  rejectProfile,
  rejectVehicle,
  suspendVehicle,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Kind = "profile" | "vehicle";
type Mode = "idle" | "reject" | "suspend";

export function ReviewActions({ kind, id, status }: { kind: Kind; id: string; status: string }) {
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

  if (mode !== "idle") {
    const isReject = mode === "reject";
    return (
      <div className="flex flex-col gap-2">
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
