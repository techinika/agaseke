import React from "react";

export default function Step({
  icon,
  title,
  desc,
  step,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  step?: number;
}) {
  return (
    <div className="flex flex-col items-center relative">
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border border-border shadow-sm z-10 relative">
          {React.cloneElement(icon as React.ReactElement, { size: 28 } as any)}
        </div>
        {step && (
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-black z-20 shadow-md">
            {step}
          </div>
        )}
      </div>
      <h4 className="font-bold uppercase tracking-tighter text-lg mb-2">
        {title}
      </h4>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>
  );
}
