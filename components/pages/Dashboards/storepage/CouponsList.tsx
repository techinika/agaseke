import React from "react";
import { Tag, Edit, Trash2 } from "lucide-react";
import { Coupon } from "@/types/store";
import { formatCurrency } from "@/types/currency";
import { Badge, Button, Card, EmptyState } from "@/components/ui";

export default function CouponsList({
  coupons,
  onEdit,
  onDelete,
  currency = "RWF",
}: {
  coupons: Coupon[];
  onEdit: (c: Coupon) => void;
  onDelete: (id: string) => void;
  currency?: string;
}) {
  if (coupons.length === 0) {
    return (
      <EmptyState
        icon={<Tag className="size-6" aria-hidden="true" />}
        title="No coupons yet"
        description="Create discount codes to reward supporters or boost product launches."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {coupons.map((coupon) => (
        <Card key={coupon.id} className="flex flex-col p-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <span className="rounded-control bg-brand-soft px-3 py-1 font-mono text-body font-bold text-brand-strong">
              {coupon.code}
            </span>
            <Badge tone={coupon.active ? "success" : "neutral"}>
              {coupon.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-heading font-bold tabular-nums text-fg">
            {coupon.discountType === "percentage"
              ? `${coupon.discountValue}% off`
              : `${formatCurrency(coupon.discountValue, currency)} off`}
          </p>
          <div className="mt-2 space-y-1 text-caption text-muted-fg">
            {Boolean(coupon.minPurchase) && (
              <p className="tabular-nums">
                Min. purchase: {formatCurrency(coupon.minPurchase ?? 0, currency)}
              </p>
            )}
            <p className="tabular-nums">
              Used {coupon.usedCount} times
              {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
            </p>
          </div>
          <div className="mt-5 flex gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(coupon)}
              leadingIcon={<Edit className="size-3.5" aria-hidden="true" />}
              className="flex-1"
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Delete coupon ${coupon.code}`}
              onClick={() => onDelete(coupon.id)}
              className="border border-line text-danger hover:bg-danger-bg"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
