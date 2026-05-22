"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setIncidentStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function IncidentActions({ id, status }: { id: string; status: string }) {
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setResolving(false);
        setNotes("");
        toast.success("Incident updated");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Action failed.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  if (status === "resolved") {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => run(async () => setIncidentStatus(id, "open"))}
      >
        Reopen
      </Button>
    );
  }

  if (resolving) {
    return (
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Resolution / investigation notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          autoFocus
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(async () => setIncidentStatus(id, "resolved", notes))}
          >
            {pending ? "Saving…" : "Mark resolved"}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => setResolving(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "open" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(async () => setIncidentStatus(id, "under_investigation"))}
          >
            Investigate
          </Button>
        ) : null}
        <Button size="sm" disabled={pending} onClick={() => setResolving(true)}>
          Resolve
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
