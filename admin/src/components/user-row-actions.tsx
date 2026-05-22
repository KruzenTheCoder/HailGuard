"use client";

import type { UserRole } from "@hailguard/shared";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deletePortalUser, setUserRole } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function UserRowActions({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        defaultValue={role}
        disabled={pending || isSelf}
        onChange={(e) =>
          startTransition(async () => {
            try {
              await setUserRole(userId, e.target.value as UserRole);
              toast.success("Role updated");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not update role");
            }
          })
        }
        className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="super_admin">Super admin</option>
        <option value="compliance_admin">Compliance admin</option>
        <option value="reviewer">Reviewer</option>
        <option value="inspector">Inspector</option>
        <option value="admin">Admin</option>
        <option value="driver">Driver</option>
      </select>

      {isSelf ? (
        <span className="text-xs text-muted-foreground">You</span>
      ) : confirming ? (
        <>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deletePortalUser(userId);
                  toast.success("User deleted");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not delete user");
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
        </>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete user"
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}
