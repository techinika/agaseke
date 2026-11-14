"use client";

import { useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import {
  CreatorTrustRow,
  SupporterActionSheet,
  type ActionSheetStatus,
} from "@/features/actions";

export interface FreeRsvpSheetProps {
  open: boolean;
  onClose: () => void;
  creatorName: string;
  creatorPhotoURL?: string | null;
  creatorVerified?: boolean;
  title: string;
  date: string;
  time: string;
  location: string;
  onConfirm: () => Promise<void>;
  onConfirmed?: () => void;
}

function errorMessage(error: unknown): string | null {
  return error instanceof Error && error.message ? error.message : null;
}

export function FreeRsvpSheet({
  open,
  onClose,
  creatorName,
  creatorPhotoURL,
  creatorVerified,
  title,
  date,
  time,
  location,
  onConfirm,
  onConfirmed,
}: FreeRsvpSheetProps) {
  const [status, setStatus] = useState<ActionSheetStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      await onConfirm();
      setStatus("success");
      onConfirmed?.();
    } catch (caught) {
      setError(errorMessage(caught));
      setStatus("failed");
    }
  };

  return (
    <SupporterActionSheet
      open={open}
      onClose={onClose}
      title={t("actions.rsvp.title", { title })}
      description={t("actions.rsvp.hint")}
      status={status}
      successTitle={t("actions.rsvp.successTitle")}
      successBody={t("actions.rsvp.successBody", { title })}
      failedTitle={t("actions.rsvp.failedTitle")}
      failedBody={t("actions.rsvp.failedBody")}
      error={error}
      onRetry={() => void submit()}
      footer={
        <Button
          fullWidth
          size="lg"
          loading={status === "submitting"}
          onClick={() => void submit()}
        >
          {status === "submitting" ? t("actions.rsvp.ctaLoading") : t("actions.rsvp.cta")}
        </Button>
      }
    >
      <CreatorTrustRow
        name={creatorName}
        photoURL={creatorPhotoURL}
        verified={creatorVerified}
        subtitle={t("actions.rsvp.hostedBy", { name: creatorName })}
      />

      <div className="space-y-3 rounded-control border border-line bg-surface p-4">
        <p className="text-body font-semibold text-fg">{title}</p>
        <div className="flex items-center gap-2 text-label text-muted-fg">
          <Calendar className="size-4 shrink-0" aria-hidden="true" />
          <span>{t("actions.rsvp.when", { date, time })}</span>
        </div>
        <div className="flex items-center gap-2 text-label text-muted-fg">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span>{t("actions.rsvp.where", { location })}</span>
        </div>
      </div>
    </SupporterActionSheet>
  );
}
