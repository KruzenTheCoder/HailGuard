"use client";

import { useState, useTransition } from "react";

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
              setResult(
                `${r.vehiclesSuspended} suspended · ${r.subscriptionsExpired} expired`
              );
            } catch (e) {
              setResult(e instanceof Error ? e.message : "Sweep failed");
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
