import React from "react";
import { Tag, Edit, Trash2 } from "lucide-react";
import { Coupon } from "@/types/store";
import { formatCurrency } from "@/types/currency";

export default function CouponsList({
  coupons,
  onEdit,
  onDelete,
}: {
  coupons: Coupon[];
  onEdit: (c: Coupon) => void;
  onDelete: (id: string) => void;
}) {
  if (coupons.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <Tag size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-muted-foreground font-medium">No coupons yet</p>
        <p className="text-muted-foreground text-sm mt-2">
          Create discount coupons for your customers
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {coupons.map((coupon) => (
        <div
          key={coupon.id}
          className="bg-card rounded-lg border border-border p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg font-bold text-lg">
              {coupon.code}
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                coupon.active
                  ? "bg-green-100 text-green-600"
                  : "bg-border text-muted-foreground"
              }`}
            >
              {coupon.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-2">
            {coupon.discountType === "percentage"
              ? `${coupon.discountValue}% OFF`
              : `${formatCurrency(coupon.discountValue, "RWF")} OFF`}
          </p>
          {coupon.minPurchase && (
            <p className="text-xs text-muted-foreground mb-2">
              Min. purchase: {formatCurrency(coupon.minPurchase, "RWF")}
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-4">
            Used {coupon.usedCount} times
            {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(coupon)}
              className="flex-1 py-2 text-xs font-bold border border-border-strong text-muted-foreground rounded-lg hover:bg-muted transition"
            >
              <Edit size={14} className="inline mr-1" /> Edit
            </button>
            <button
              onClick={() => onDelete(coupon.id)}
              className="flex-1 py-2 text-xs font-bold border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition"
            >
              <Trash2 size={14} className="inline mr-1" /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
