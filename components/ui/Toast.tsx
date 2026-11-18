"use client";

import { Toaster, toast } from "sonner";

export { toast };

export function ToastViewport() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 text-body text-fg shadow-card",
          title: "text-body font-semibold text-fg",
          description: "text-label text-muted-fg",
          actionButton: "rounded-control bg-brand-strong px-3 py-2 text-on-brand",
          cancelButton: "rounded-control bg-surface-sunken px-3 py-2 text-fg",
        },
      }}
    />
  );
}
