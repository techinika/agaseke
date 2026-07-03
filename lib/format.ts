export function formatCurrency(amount: number | undefined | null, currency?: string): string {
  const code = (currency || "RWF").toUpperCase();
  const val = amount || 0;
  return `${val.toLocaleString()} ${code}`;
}

export function isMoMoSupported(currency?: string): boolean {
  const code = (currency || "RWF").toUpperCase();
  return code === "RWF";
}
