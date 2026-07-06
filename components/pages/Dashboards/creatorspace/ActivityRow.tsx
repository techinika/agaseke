import React from "react";
import { getCurrencySymbol } from "@/types/currency";

export default function ActivityRow({ name, amount, time, currency = "RWF" }: any) {
  return (
    <div className="p-6 flex items-center gap-4 hover:bg-muted transition border-b border-border last:border-0">
      <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-lg font-bold shrink-0">
        {name[0]}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">
            {name}{" "}
            <span className="font-normal text-muted-foreground ml-1">gifted you</span>
          </p>
          <span className="text-[10px] font-bold text-slate-300 uppercase">
            {time}
          </span>
        </div>
        <p className="text-lg font-bold text-orange-600 tracking-tight">
          {amount} {getCurrencySymbol(currency)}
        </p>
      </div>
    </div>
  );
}
