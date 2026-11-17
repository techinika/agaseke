"use client";

import { Dialog, type DialogProps } from "./Dialog";

export type DrawerProps = Omit<DialogProps, "placement">;

export function Drawer(props: DrawerProps) {
  return <Dialog placement="right" {...props} />;
}
