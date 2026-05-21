import { Badge } from "@/components/ui/badge";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const STATUS_TONE: Record<string, Tone> = {
  approved: "success",
  active: "success",
  pending: "warning",
  pending_payment: "warning",
  rejected: "danger",
  suspended: "danger",
  expired: "danger",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  pending_payment: "Payment due",
  approved: "Approved",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
