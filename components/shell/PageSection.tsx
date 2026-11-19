import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  contentClassName?: string;
}

export function PageSection({
  title,
  description,
  actions,
  children,
  id,
  className,
  contentClassName,
}: PageSectionProps) {
  const generatedId = useId();
  const headingId = id ?? generatedId;

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn("space-y-4", className)}
    >
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="text-title font-bold text-fg">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-label text-muted-fg">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
