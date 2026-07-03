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
      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-6 border border-border shadow-sm">
        {React.cloneElement(icon as React.ReactElement, { size: 28 } as any)}
      </div>
      <h4 className="font-bold uppercase tracking-tighter text-lg mb-2">
        {title}
      </h4>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>
  );
}
