"use client";

import { useState, useTransition } from "react";

import { cancelSubscription } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function CancelSubscriptionButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Cancel
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => cancelSubscription(id))}
      >
        {pending ? "…" : "Confirm"}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </div>
  );
}
