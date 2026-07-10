import React, { useState } from "react";
import { X, Loader } from "lucide-react";
import { toast } from "sonner";
import { Product, getProductCurrency, getProductPrice } from "@/types/store";
import { formatCurrency } from "@/types/currency";

export default function CreateOrderModal({
  products,
  onClose,
  onSave,
}: {
  products: Product[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    productIds: [] as { productId: string; quantity: number; price: number }[],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setFormData((prev) => ({
      ...prev,
      productIds: [
        ...prev.productIds,
        { productId, quantity: 1, price: getProductPrice(product) },
      ],
    }));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    }));
  };

  const removeProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.filter(
        (item) => item.productId !== productId,
      ),
    }));
  };

  const totalAmount = formData.productIds.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const handleSubmit = async () => {
    if (
      !formData.customerName ||
      !formData.customerEmail ||
      formData.productIds.length === 0
    ) {
      toast.error("Please fill in required fields and add products");
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">Create Order</h2>
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
              Customer Name *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              placeholder="Customer name"
              className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Customer Email *
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) =>
                setFormData({ ...formData, customerEmail: e.target.value })
              }
              placeholder="customer@example.com"
              className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Add Products *
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) addProduct(e.target.value);
                e.target.value = "";
              }}
              className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
            >
              <option value="">Select a product to add</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(getProductPrice(product), getProductCurrency(product))}
                </option>
              ))}
            </select>
          </div>

          {formData.productIds.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">
                Order Items
              </label>
              {formData.productIds.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{product?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(product ? getProductPrice(product) : 0, product ? getProductCurrency(product) : "RWF")} each
                      </p>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.productId, parseInt(e.target.value))
                      }
                      className="w-16 bg-card border border-border-strong rounded-lg px-2 py-1 text-center"
                    />
                    <p className="font-bold w-24 text-right">
                      {formatCurrency(item.price * item.quantity, "RWF")}
                    </p>
                    <button
                      onClick={() => removeProduct(item.productId)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {totalAmount > 0 && (
            <div className="p-4 bg-orange-50 rounded-lg flex justify-between items-center">
              <p className="font-bold">Total Amount</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(totalAmount, "RWF")}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Order notes..."
              className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3 h-20"
            />
          </div>
        </div>

        <div className="p-6 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={
              saving ||
              !formData.customerName ||
              !formData.customerEmail ||
              formData.productIds.length === 0
            }
            className="w-full bg-orange-600 text-white py-4 rounded-lg font-bold hover:bg-orange-700 transition disabled:opacity-50"
          >
            {saving ? (
              <Loader className="animate-spin mx-auto" />
            ) : (
              "Create Order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
