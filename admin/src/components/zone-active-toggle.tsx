"use client";

import { useTransition } from "react";

import { setZoneActive } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function ZoneActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(async () => setZoneActive(id, !isActive))}
    >
      {pending ? "…" : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
