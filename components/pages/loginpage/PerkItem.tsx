import React from "react";

export default function PerkItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
        {icon}
      </span>
      <div>
        <h3 className="text-body font-bold text-fg">{title}</h3>
        <p className="mt-1 text-label leading-relaxed text-muted-fg">{desc}</p>
      </div>
    </div>
  );
}
