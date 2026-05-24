import React from "react";
import { Wallet } from "lucide-react";

export default function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="p-20 text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-4">
        <Wallet className="text-slate-200" />
      </div>
      <p className="text-slate-400 font-bold text-sm">{msg}</p>
    </div>
  );
}
