export interface CreatorHomeStat {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: "brand" | "success" | "info" | "warning";
  href?: string;
}

export interface CreatorHomeSupport {
  id: string;
  name: string;
  amount: number;
  currency: string;
  createdAt?: unknown;
  anonymous?: boolean;
}

export interface CreatorHomeQuickAction {
  label: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
  tone?: "brand" | "success" | "info";
}
