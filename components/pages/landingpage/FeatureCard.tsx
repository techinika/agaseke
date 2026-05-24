import React from "react";

export default function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 rounded-lg bg-white border border-slate-200/50 hover:shadow-xl hover:border-orange-100 transition-all duration-300">
      <div className="mb-6 inline-flex p-3 bg-orange-50 rounded-xl text-orange-600">
        {React.cloneElement(icon as React.ReactElement, { size: 24 } as any)}
      </div>
      <h3 className="text-lg font-bold uppercase tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
