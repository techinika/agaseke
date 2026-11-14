import { cn } from "@/lib/cn";
import {
  DEFAULT_CURRENCY,
  formatMoney,
  formatMoneyLeading,
  type MoneyInput,
} from "@/lib/format/money";

export interface MoneyProps {
  value: MoneyInput;
  currency?: string;
  leading?: boolean;
  className?: string;
}

export function Money({
  value,
  currency = DEFAULT_CURRENCY,
  leading = false,
  className,
}: MoneyProps) {
  const formatted = leading
    ? formatMoneyLeading(value, currency)
    : formatMoney(value, currency);
  return <span className={cn("tabular-nums", className)}>{formatted}</span>;
}
