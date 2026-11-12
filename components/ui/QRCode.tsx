"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Button } from "./Button";

export interface QRCodeProps {
  value: string;
  size?: number;
  title?: string;
  hint?: string;
  fileName?: string;
  showDownload?: boolean;
  className?: string;
}

export function QRCode({
  value,
  size = 200,
  title = t("media.qr"),
  hint = t("media.qrHint"),
  fileName = "agaseke-qr.png",
  showDownload = true,
  className,
}: QRCodeProps) {
  const wrapper = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = wrapper.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div ref={wrapper} className="rounded-control bg-white p-3 shadow-sm">
        <QRCodeCanvas
          value={value}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#171717"
          title={title}
        />
      </div>
      {hint && <p className="text-caption text-muted-fg">{hint}</p>}
      {showDownload && (
        <Button
          variant="secondary"
          size="md"
          onClick={download}
          leadingIcon={<Download className="size-4" aria-hidden="true" />}
        >
          {t("media.download")}
        </Button>
      )}
    </div>
  );
}
