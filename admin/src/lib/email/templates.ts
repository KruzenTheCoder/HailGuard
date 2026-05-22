// Themed, email-client-safe HTML templates (inline styles, table layout).
// HailGuard palette: navy #0d2236, emerald #16be66.

const NAVY = "#0d2236";
const GREEN = "#16be66";

export type Email = { subject: string; html: string };

function layout(opts: {
  heading: string;
  intro: string;
  bodyHtml?: string;
  cta?: { label: string; url: string };
  footnote?: string;
}): string {
  const { heading, intro, bodyHtml = "", cta, footnote } = opts;
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0b1b2d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e8ed;">
        <tr><td style="background:${NAVY};padding:22px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">HAILGUARD</span>
          <span style="color:${GREEN};font-size:11px;font-weight:600;letter-spacing:3px;display:block;margin-top:2px;">ZONE COMPLIANCE</span>
        </td></tr>
        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:${NAVY};">${heading}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${intro}</p>
          ${bodyHtml}
          ${
            cta
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:10px;background:${GREEN};">
                  <a href="${cta.url}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${cta.label}</a>
                </td></tr></table>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #eef1f4;">
          <p style="margin:0;font-size:12px;color:#9aa6b2;">${footnote ?? "HailGuard — e-hailing zone compliance. This is an automated message."}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">${label}</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:${NAVY};text-align:right;">${value}</td></tr>`;
}

export function welcomeEmail(p: { fullName: string; email: string; role: string; loginUrl: string }): Email {
  return {
    subject: "Your HailGuard portal access",
    html: layout({
      heading: `Welcome${p.fullName ? `, ${p.fullName.split(" ")[0]}` : ""}`,
      intro: `An account has been created for you on the HailGuard ${p.role === "admin" ? "Fleet Portal" : "platform"}. Your administrator will share your temporary password separately — please change it after signing in.`,
      bodyHtml: `<table role="presentation" width="100%">${row("Email", p.email)}${row("Role", p.role)}</table>`,
      cta: { label: "Sign in", url: p.loginUrl },
    }),
  };
}

export function certificateEmail(p: {
  fullName: string;
  zone: string;
  plate: string;
  validUntil: string;
  verifyUrl: string;
}): Email {
  return {
    subject: `Your HailGuard compliance certificate — ${p.zone}`,
    html: layout({
      heading: "Your compliance certificate",
      intro: `Here is the digital Zone Pass for your vehicle. Show the QR or share the verification link with an inspector.`,
      bodyHtml: `<table role="presentation" width="100%">${row("Zone", p.zone)}${row("Vehicle", p.plate)}${row("Valid until", p.validUntil)}</table>`,
      cta: { label: "View / verify pass", url: p.verifyUrl },
    }),
  };
}

export function expiryReminderEmail(p: {
  fullName: string;
  items: { label: string; date: string; daysLeft: number }[];
}): Email {
  const list = p.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;font-size:14px;color:#374151;">${i.label}</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right;color:${i.daysLeft <= 0 ? "#e5484d" : "#d97706"};">${i.daysLeft <= 0 ? "Expired" : `${i.daysLeft} days`} (${i.date})</td></tr>`
    )
    .join("");
  return {
    subject: "Action needed: HailGuard documents expiring",
    html: layout({
      heading: "Renew to stay compliant",
      intro: `One or more of your compliance documents is expiring soon. Renew before they lapse to avoid suspension.`,
      bodyHtml: `<table role="presentation" width="100%">${list}</table>`,
    }),
  };
}

export function complianceEmail(p: { fullName: string; reason: string }): Email {
  return {
    subject: "HailGuard compliance update",
    html: layout({
      heading: "Compliance status changed",
      intro: p.reason,
    }),
  };
}

export function incidentResolvedEmail(p: { fullName: string; type: string }): Email {
  return {
    subject: "Your reported incident has been resolved",
    html: layout({
      heading: "Incident resolved",
      intro: `Your reported ${p.type.replace(/_/g, " ")} has been reviewed and resolved by the HailGuard operations team. Thank you for reporting it.`,
    }),
  };
}
