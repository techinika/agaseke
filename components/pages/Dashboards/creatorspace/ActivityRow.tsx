import React from "react";

export default function ActivityRow({ name, amount, time }: any) {
  return (
    <div className="p-6 flex items-center gap-4 hover:bg-slate-50 transition border-b border-slate-50 last:border-0">
      <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-lg font-bold shrink-0">
        {name[0]}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">
            {name}{" "}
            <span className="font-normal text-slate-400 ml-1">gifted you</span>
          </p>
          <span className="text-[10px] font-bold text-slate-300 uppercase">
            {time}
          </span>
        </div>
        <p className="text-lg font-bold text-orange-600 tracking-tight">
          {amount} RWF
        </p>
      </div>
    </div>
  );
}
