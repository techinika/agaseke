"use client";

import { Toaster, toast } from "sonner";

export { toast };

export function ToastViewport() {
  return <Toaster richColors position="top-center" />;
}
