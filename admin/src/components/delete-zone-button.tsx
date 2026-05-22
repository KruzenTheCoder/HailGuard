"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteZone } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function DeleteZoneButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" size="icon" aria-label="Delete zone" onClick={() => setConfirming(true)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await deleteZone(id);
              toast.success("Zone deleted", { description: name });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not delete zone");
              setConfirming(false);
            }
          })
        }
      >
        {pending ? "…" : "Delete"}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </div>
  );
}
