"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { setZoneActive } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function ZoneActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await setZoneActive(id, !isActive);
            toast.success(isActive ? "Zone deactivated" : "Zone activated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not update zone");
          }
        })
      }
    >
      {pending ? "…" : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
