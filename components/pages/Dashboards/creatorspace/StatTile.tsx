import React from "react";

export default function StatTile({ title, value, icon }: any) {
  return (
    <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {title}
        </p>
        <div className="text-orange-500">{icon}</div>
      </div>
      <h3 className="text-4xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}
