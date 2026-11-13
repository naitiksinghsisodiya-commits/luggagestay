import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types";

const statusConfig: Record<BookingStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  CONFIRMED: { label: "Awaiting drop-off", variant: "warning" },
  CHECKED_IN: { label: "Checked in", variant: "default" },
  CHECKED_OUT: { label: "Checked out", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = statusConfig[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
