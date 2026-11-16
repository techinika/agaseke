// AUTO-GENERATED FILE. DO NOT EDIT.
// Source: shared/money/paymentRails.json
// Regenerate: node scripts/money/generate-registry.mjs

export const PAYMENT_METHODS = ["momo", "card"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentRailProvider {
  readonly id: string;
  readonly label: string;
  readonly methods: readonly PaymentMethod[];
  readonly currencies: readonly string[];
  readonly countries: readonly string[];
}

export const PAYMENT_RAIL_PROVIDERS: Readonly<Record<string, PaymentRailProvider>> = {
  paypack: {
    id: "paypack",
    label: "Mobile Money",
    methods: ["momo"],
    currencies: ["RWF"],
    countries: ["RW"],
  },
  pesapal: {
    id: "pesapal",
    label: "Bank Card",
    methods: ["card"],
    currencies: ["RWF", "USD", "KES", "UGX", "TZS"],
    countries: ["RW", "KE", "UG", "TZ", "US"],
  },
};

export const PAYMENT_RAIL_PROVIDER_LIST: readonly PaymentRailProvider[] =
  Object.values(PAYMENT_RAIL_PROVIDERS);

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

export function getPaymentRailProvider(id: string): PaymentRailProvider | undefined {
  return Object.prototype.hasOwnProperty.call(PAYMENT_RAIL_PROVIDERS, id)
    ? PAYMENT_RAIL_PROVIDERS[id]
    : undefined;
}
