"use client";

import { Mail } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { emailCertificate, emailExpiryReminders } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function EmailCertificateButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await emailCertificate(subscriptionId);
            toast.success("Certificate emailed to driver");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not send email");
          }
        })
      }
    >
      <Mail className="mr-1.5 h-3.5 w-3.5" />
      Email pass
    </Button>
  );
}

export function EmailExpiryRemindersButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const r = await emailExpiryReminders();
            toast.success(
              r.sent > 0
                ? `Sent ${r.sent} reminder${r.sent === 1 ? "" : "s"}.`
                : r.recipients > 0
                  ? "Reminders queued (configure RESEND_API_KEY to deliver)."
                  : "No documents expiring within 30 days."
            );
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not send reminders");
          }
        })
      }
    >
      <Mail className="mr-2 h-4 w-4" />
      {pending ? "Sending…" : "Email expiry reminders"}
    </Button>
  );
}
