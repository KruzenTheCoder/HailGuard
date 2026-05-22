import "server-only";

import { Resend } from "resend";

import * as t from "./templates";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "HailGuard <onboarding@resend.dev>";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

/** Best-effort send — logs and swallows errors so it never breaks an action. */
async function send(to: string | null | undefined, email: t.Email): Promise<boolean> {
  if (!to) return false;
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${email.subject}" to ${to}`);
    return false;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject: email.subject, html: email.html });
    return true;
  } catch (e) {
    console.error("[email] send failed:", e);
    return false;
  }
}

export function sendWelcome(to: string, p: { fullName: string; role: string }) {
  return send(to, t.welcomeEmail({ ...p, email: to, loginUrl: `${APP_URL}/login` }));
}

export function sendCertificate(
  to: string,
  p: { fullName: string; zone: string; plate: string; validUntil: string; subscriptionId: string }
) {
  return send(
    to,
    t.certificateEmail({
      fullName: p.fullName,
      zone: p.zone,
      plate: p.plate,
      validUntil: p.validUntil,
      verifyUrl: `${APP_URL}/verify/${p.subscriptionId}`,
    })
  );
}

export function sendExpiryReminder(
  to: string,
  p: { fullName: string; items: { label: string; date: string; daysLeft: number }[] }
) {
  return send(to, t.expiryReminderEmail(p));
}

export function sendComplianceUpdate(to: string, p: { fullName: string; reason: string }) {
  return send(to, t.complianceEmail(p));
}

export function sendIncidentResolved(to: string, p: { fullName: string; type: string }) {
  return send(to, t.incidentResolvedEmail(p));
}
