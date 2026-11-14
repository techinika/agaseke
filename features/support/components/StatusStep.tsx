"use client";

import { toast } from "@/components/ui/Toast";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { formatMoney } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import type { SupportMethod, SupportStatus } from "../types";

export interface StatusStepProps {
  status: SupportStatus;
  creatorName: string;
  handle: string;
  amount: number;
  currency: string;
  reference: string | null;
  method: SupportMethod;
  waitingLong: boolean;
  error?: string | null;
  cardRedirectUrl?: string | null;
  checking: boolean;
  checkHint?: string | null;
  onCheck: () => void;
  onRetry: () => void;
  onClose: () => void;
}

async function shareCreator(handle: string, creatorName: string) {
  const url = `https://agaseke.me/${handle}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: creatorName, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success(t("common.copied"));
  } catch {
    window.prompt(t("common.copy"), url);
  }
}

export function StatusStep({
  status,
  creatorName,
  handle,
  amount,
  currency,
  reference,
  method,
  waitingLong,
  error,
  cardRedirectUrl,
  checking,
  checkHint,
  onCheck,
  onRetry,
  onClose,
}: StatusStepProps) {
  if (status === "success") {
    return (
      <div className="space-y-3">
        <StatusScreen
          status="success"
          name={creatorName}
          description={t("support.status.success.body", { name: creatorName })}
          reference={reference ?? undefined}
          primaryAction={{
            label: t("support.status.shareCreator", { name: creatorName }),
            onClick: () => void shareCreator(handle, creatorName),
          }}
          secondaryAction={{
            label: t("support.status.backToProfile"),
            onClick: onClose,
          }}
        />
        <p className="text-center text-caption text-muted-fg">
          {t("support.status.receipt")}
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <StatusScreen
        status="failed"
        description={error || t("support.status.failedBody")}
        reference={reference ?? undefined}
        primaryAction={{
          label: t("support.status.tryAgain"),
          onClick: onRetry,
        }}
        secondaryAction={{
          label: t("common.close"),
          onClick: onClose,
        }}
      />
    );
  }

  const waitingDescription =
    method === "card"
      ? t("support.status.waiting.bodyCard")
      : t("support.status.waiting.body");

  const primaryAction = cardRedirectUrl
    ? {
        label: t("support.status.openCard"),
        onClick: () => window.location.assign(cardRedirectUrl),
      }
    : {
        label: checking ? t("support.status.checking") : t("support.status.checkAgain"),
        onClick: onCheck,
        loading: checking,
      };

  return (
    <div className="space-y-3">
      <StatusScreen
        status="waiting"
        name={creatorName}
        title={t("support.status.waiting.title")}
        description={waitingDescription}
        reference={reference ?? undefined}
        primaryAction={primaryAction}
        secondaryAction={{
          label: t("support.status.done"),
          onClick: onClose,
        }}
      />

      <div className="rounded-control bg-surface-raised p-3 text-center">
        <p className="text-label font-semibold text-fg">
          {formatMoney(amount, currency)}
        </p>
        <p className="mt-1 text-caption text-muted-fg">
          {t("support.trust.paying", { name: creatorName })}
        </p>
      </div>

      {waitingLong && (
        <p className="rounded-control bg-warning-bg p-3 text-label text-warning">
          {t("support.status.waitingLong")}
        </p>
      )}

      {checkHint && (
        <p aria-live="polite" className="text-center text-caption text-muted-fg">
          {checkHint}
        </p>
      )}
    </div>
  );
}
