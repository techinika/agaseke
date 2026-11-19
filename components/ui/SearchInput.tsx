import { forwardRef, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Input } from "./Input";

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { label, hint, error, containerClassName, className, onClear, value, ...props },
    ref,
  ) {
    const hasValue = typeof value === "string" && value.length > 0;

    return (
      <Input
        ref={ref}
        type="search"
        label={label}
        hint={hint}
        error={error}
        containerClassName={containerClassName}
        leading={<Search className="size-4" aria-hidden="true" />}
        trailing={
          hasValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              aria-label={t("common.clear")}
              className="-mr-3 flex size-11 items-center justify-center rounded-control text-muted-fg outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : undefined
        }
        className={cn(
          "[&::-webkit-search-cancel-button]:appearance-none",
          hasValue && "pr-14",
          className,
        )}
        value={value}
        {...props}
      />
    );
  },
);
