import React, { useState } from "react";
import { X, Loader } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/store";

export default function CouponModal({
  coupon,
  products,
  onClose,
  onSave,
}: {
  coupon: any | null;
  products: Product[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    code: coupon?.code || "",
    discountType:
      (coupon?.discountType as "percentage" | "fixed") || "percentage",
    discountValue: coupon?.discountValue || 0,
    minPurchase: coupon?.minPurchase || 0,
    maxUses: coupon?.maxUses || 0,
    productIds: coupon?.productIds || ([] as string[]),
    active: coupon?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!formData.code || !formData.discountValue) {
      toast.error("Please fill in required fields");
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const toggleProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id: string) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">
            {coupon ? "Edit Coupon" : "Create Coupon"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-hover rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Coupon Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g., SUMMER20"
              className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">
                Discount Type
              </label>
              <select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountType: e.target.value as any,
                  })
                }
                className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">
                Discount Value *
              </label>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountValue: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">
                Min. Purchase (RWF)
              </label>
              <input
                type="number"
                value={formData.minPurchase}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minPurchase: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0 for no minimum"
                className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">
                Max Uses
              </label>
              <input
                type="number"
                value={formData.maxUses}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxUses: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Empty for unlimited"
                className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Apply to Products (optional)
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Leave empty to apply to all products
            </p>
            <div className="max-h-40 overflow-y-auto border border-border-strong rounded-lg">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={formData.productIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">{product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.price.toLocaleString()} RWF
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-bold">Active</p>
              <p className="text-xs text-muted-foreground">
                Customers can use this coupon
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, active: !formData.active })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                formData.active ? "bg-green-500" : "bg-border-strong"
              }`}
            >
              <div
                className={`w-5 h-5 bg-card rounded-full shadow transition-transform ${
                  formData.active ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.code || !formData.discountValue}
            className="w-full bg-orange-600 text-white py-4 rounded-lg font-bold hover:bg-orange-700 transition disabled:opacity-50"
          >
            {saving ? (
              <Loader className="animate-spin mx-auto" />
            ) : coupon ? (
              "Update Coupon"
            ) : (
              "Create Coupon"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
