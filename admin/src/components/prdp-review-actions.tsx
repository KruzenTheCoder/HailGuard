"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { verifyPrdp, rejectPrdp } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PrdpReviewActions({
  profileId,
  prdpStatus,
  canReview = false,
}: {
  profileId: string;
  prdpStatus: string;
  canReview?: boolean;
}) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn();
        setIsRejecting(false);
        setReason("");
        toast.success(successMsg);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Action failed.";
        toast.error(msg);
      }
    });
  }

  if (prdpStatus === "verified") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span>Professional Driving Permit is verified and compliant.</span>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        <XCircle className="h-4 w-4 text-amber-600" />
        <span>PrDP is pending verification. You do not have permission to verify.</span>
      </div>
    );
  }

  if (isRejecting) {
    return (
      <div className="flex flex-col gap-2 mt-2">
        <Textarea
          placeholder="Reason for PrDP rejection (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={pending || !reason.trim()}
            onClick={() =>
              run(
                () => rejectPrdp(profileId, reason),
                "PrDP document rejected."
              )
            }
          >
            {pending ? "Saving…" : "Confirm Rejection"}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setIsRejecting(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2 border-t border-border pt-4">
      <p className="text-xs text-muted-foreground font-medium">Verify driver's Professional Driving Permit (PrDP):</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={pending}
          onClick={() =>
            run(
              () => verifyPrdp(profileId),
              "PrDP document verified."
            )
          }
        >
          {pending ? "Saving…" : "Verify PrDP"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={pending}
          onClick={() => setIsRejecting(true)}
        >
          Reject Document
        </Button>
      </div>
    </div>
  );
}
