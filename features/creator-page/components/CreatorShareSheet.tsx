"use client";

import { QRCode } from "@/components/ui/QRCode";
import { ShareButton } from "@/components/ui/ShareButton";
import { Sheet } from "@/components/ui/Sheet";
import { t } from "@/lib/i18n";

export interface CreatorShareSheetProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  handle: string;
}

export function CreatorShareSheet({
  open,
  onClose,
  displayName,
  handle,
}: CreatorShareSheetProps) {
  const url = `https://agaseke.me/${handle}`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("creator.shareTitle", { name: displayName })}
      description={t("creator.shareHint")}
    >
      <ShareButton
        url={url}
        title={displayName}
        label={t("creator.shareProfile")}
        size="lg"
        fullWidth
        onShared={onClose}
      />
      <p className="mt-3 break-all rounded-control bg-surface-raised px-3 py-2 text-center text-label text-muted-fg">
        {url}
      </p>
      <div className="mt-5 flex justify-center">
        <QRCode
          value={url}
          size={180}
          title={t("creator.shareTitle", { name: displayName })}
          fileName={`agaseke-${handle}.png`}
        />
      </div>
    </Sheet>
  );
}
