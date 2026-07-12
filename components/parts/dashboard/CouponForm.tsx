"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Product, getProductCurrency, getProductPrice } from "@/types/store";
import { formatCurrency } from "@/types/currency";

export default function CouponForm() {
  const { creator } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 0,
    minPurchase: 0,
    maxUses: 0,
    productIds: [] as string[],
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!creator?.uid) return;
    const productsRef = collection(db, "storeProducts");
    const q = query(productsRef, where("creatorId", "==", creator.uid));
    getDocs(q).then((snapshot) => {
      const productData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productData);
    }).catch(console.error);
  }, [creator?.uid]);

  const handleSubmit = async () => {
    if (!creator?.uid) { toast.error("Not authenticated"); return; }
    if (!formData.code || !formData.discountValue) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "storeCoupons"), {
        ...formData,
        creatorId: creator.uid,
        usedCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Coupon created!");
      router.push("/creator/store");
    } catch (error) {
      console.error("Create coupon error:", error);
      toast.error("Failed to create coupon");
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/creator/store")}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            Create Coupon
          </h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 space-y-8">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Coupon Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g., SUMMER20"
              className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
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
                className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
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
                className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
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
                className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
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
                className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Apply to Products (optional)
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Leave empty to apply to all products
            </p>
            <div className="max-h-40 overflow-y-auto border border-border rounded-xl">
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
                    {formatCurrency(getProductPrice(product), getProductCurrency(product))}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
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

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/creator/store")}
              className="flex-1 py-4 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.code || !formData.discountValue}
              className="flex-[2] bg-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={20} /> : null}
              {saving ? "Saving..." : "Create Coupon"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
