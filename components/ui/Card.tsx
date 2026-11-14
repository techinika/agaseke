import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface text-fg shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
