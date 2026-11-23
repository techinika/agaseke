import type { ReactNode } from "react";

export function StepHeading({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-2">
      {icon && (
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-control bg-brand-soft text-brand-strong"
        >
          {icon}
        </span>
      )}
      <h2 className="font-display text-title font-bold text-fg">{title}</h2>
      <p className="text-label leading-relaxed text-muted-fg">{description}</p>
    </header>
  );
}
