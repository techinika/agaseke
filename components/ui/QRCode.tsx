"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Button } from "./Button";

const DEFAULT_QR_BG = "rgb(255, 255, 255)";
const DEFAULT_QR_FG = "rgb(17, 24, 39)";

function resolveCssVarColor(varName: string, fallback: string): string {
  if (typeof document === "undefined" || !document.body) return fallback;
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.backgroundColor = `var(${varName})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).backgroundColor;
  document.body.removeChild(probe);
  if (!resolved || resolved === "rgba(0, 0, 0, 0)" || resolved === "transparent") {
    return fallback;
  }
  return resolved;
}

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
  const [colors, setColors] = useState<{ bg: string; fg: string }>({
    bg: DEFAULT_QR_BG,
    fg: DEFAULT_QR_FG,
  });

  useEffect(() => {
    const syncColors = () => {
      const bg = resolveCssVarColor("--ag-surface", DEFAULT_QR_BG);
      const fg = resolveCssVarColor("--ag-fg", DEFAULT_QR_FG);
      setColors((prev) => (prev.bg === bg && prev.fg === fg ? prev : { bg, fg }));
    };
    syncColors();

    const observer = new MutationObserver(syncColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

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
      <div
        ref={wrapper}
        className="rounded-control border border-line bg-surface p-3 shadow-sm"
      >
        <QRCodeCanvas
          value={value}
          size={size}
          level="M"
          bgColor={colors.bg}
          fgColor={colors.fg}
          marginSize={1}
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
