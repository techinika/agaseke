import React from "react";
import { Wallet } from "lucide-react";
import { EmptyState as UiEmptyState } from "@/components/ui/EmptyState";

export default function EmptyState({ msg }: { msg: string }) {
  return (
    <UiEmptyState
      icon={<Wallet className="size-6" aria-hidden="true" />}
      title={msg}
      description=""
      className="m-4"
    />
  );
}
