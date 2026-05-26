import React from "react";

export default function StatTile({ title, value, icon }: any) {
  return (
    <div className="bg-card p-8 rounded-lg border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {title}
        </p>
        <div className="text-orange-500">{icon}</div>
      </div>
      <h3 className="text-4xl font-bold text-foreground">{value}</h3>
    </div>
  );
}
