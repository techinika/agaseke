import React from "react";

export default function HistoryItem({ type, title, meta, icon }: any) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="mt-1 w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-600 transition">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1 group-hover:text-orange-600 transition">
          {title}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
            {type}
          </span>
          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
          <span className="text-[10px] font-medium text-slate-400">{meta}</span>
        </div>
      </div>
    </div>
  );
}
