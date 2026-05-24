import React from "react";

export default function Step({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
        {React.cloneElement(icon as React.ReactElement, { size: 28 } as any)}
      </div>
      <h4 className="font-bold uppercase tracking-tighter text-lg mb-2">
        {title}
      </h4>
      <p className="text-slate-500 text-sm">{desc}</p>
    </div>
  );
}
