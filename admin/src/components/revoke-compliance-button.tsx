"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { revokeCompliance } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function RevokeComplianceButton({ driverId }: { driverId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (msg) {
    return <span className="text-sm text-muted-foreground">{msg}</span>;
  }

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Revoke compliance
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const r = await revokeCompliance(driverId);
              const summary = `${r.subscriptionsCancelled} pass(es) cancelled, ${r.vehiclesSuspended} vehicle(s) suspended.`;
              setMsg(`Revoked — ${summary}`);
              toast.success("Compliance revoked", { description: summary });
            } catch (e) {
              const m = e instanceof Error ? e.message : "Revoke failed";
              setMsg(m);
              toast.error(m);
            }
          })
        }
      >
        {pending ? "Revoking…" : "Confirm revoke"}
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
