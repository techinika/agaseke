import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { t } from "@/lib/i18n";
import type { VerificationStatus } from "./types";

const STATUS = {
  approved: {
    tone: "success",
    icon: CheckCircle2,
    title: t("verification.status.approved.title"),
    body: t("verification.status.approved.body"),
  },
  pending: {
    tone: "warning",
    icon: Clock3,
    title: t("verification.status.pending.title"),
    body: t("verification.status.pending.body"),
  },
  rejected: {
    tone: "danger",
    icon: AlertTriangle,
    title: t("verification.status.rejected.title"),
    body: t("verification.status.rejected.body"),
  },
} as const;

export function VerificationStatusBanner({
  status,
  onStartEditing,
  rejectionReason,
}: {
  status: VerificationStatus;
  onStartEditing: () => void;
  rejectionReason?: string | null;
}) {
  if (!status) return null;
  const config = STATUS[status];
  const Icon = config.icon;
  const cleanReason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-raised text-fg">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-body-lg font-bold text-fg">{config.title}</h2>
            <Badge tone={config.tone}>{config.title}</Badge>
          </div>
          <p className="mt-1 text-label text-muted-fg">{config.body}</p>
          {status === "rejected" && cleanReason && (
            <p className="mt-2 text-label font-medium text-danger">
              Reason: {cleanReason}
            </p>
          )}
        </div>
      </div>
      <Button variant="secondary" onClick={onStartEditing}>
        {t("verification.status.update")}
      </Button>
    </Card>
  );
}
