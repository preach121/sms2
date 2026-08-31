import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; tone: "neutral" | "accent" | "ok" | "warn" | "danger" | "info" }> = {
  pending: { label: "Pending", tone: "warn" },
  processing: { label: "Pending", tone: "warn" },
  active: { label: "Active", tone: "info" },
  sms_received: { label: "SMS Received", tone: "ok" },
  completed: { label: "Completed", tone: "ok" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  approved: { label: "Approved", tone: "ok" },
  rejected: { label: "Rejected", tone: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const mapped = MAP[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={mapped.tone}>{mapped.label}</Badge>;
}
