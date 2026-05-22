"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { runComplianceSweep } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function SweepButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const r = await runComplianceSweep();
              const summary = `${r.vehiclesSuspended} suspended · ${r.subscriptionsExpired} expired`;
              setResult(summary);
              toast.success("Compliance sweep complete", { description: summary });
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Sweep failed";
              setResult(msg);
              toast.error(msg);
            }
          })
        }
      >
        {pending ? "Running…" : "Run compliance sweep"}
      </Button>
      {result ? <span className="text-sm text-muted-foreground">{result}</span> : null}
    </div>
  );
}
