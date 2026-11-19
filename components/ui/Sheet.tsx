"use client";

import { Dialog, type DialogProps } from "./Dialog";

export type SheetProps = Omit<DialogProps, "placement">;

/**
 * Responsive sheet: bottom sheet on mobile, centered dialog on larger screens.
 * Prefer `Dialog` directly when a specific placement is required.
 */
export function Sheet(props: SheetProps) {
  return <Dialog placement="responsive" {...props} />;
}
