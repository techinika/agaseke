"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader, X } from "lucide-react";
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

export default function OrderForm() {
  const { creator } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    productIds: [] as { productId: string; quantity: number; price: number }[],
    notes: "",
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
    if (!creator?.uid) { toast.error("Not authenticated"); return; }
    if (!formData.customerName || !formData.customerEmail || formData.productIds.length === 0) {
      toast.error("Please fill in required fields and add products");
      return;
    }

    setSaving(true);
    try {
      const totalAmount = formData.productIds.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      await addDoc(collection(db, "storeOrders"), {
        ...formData,
        creatorId: creator.uid,
        customerId: "",
        status: "pending" as const,
        totalAmount,
        paymentStatus: "unpaid" as const,
        paymentMethod: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Order created!");
      router.push("/creator/store");
    } catch (error) {
      console.error("Create order error:", error);
      toast.error("Failed to create order");
    } finally {
      setSaving(false);
    }
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
            Create Order
          </h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 space-y-8">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Customer Name *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              placeholder="Customer name"
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Customer Email *
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) =>
                setFormData({ ...formData, customerEmail: e.target.value })
              }
              placeholder="customer@example.com"
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Add Products *
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) addProduct(e.target.value);
                e.target.value = "";
              }}
              className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
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
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Order Items
              </label>
              {formData.productIds.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 p-3 bg-muted rounded-xl"
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
            <div className="p-4 bg-orange-50 rounded-xl flex justify-between items-center">
              <p className="font-bold">Total Amount</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(totalAmount, "RWF")}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Order notes..."
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100 h-24 resize-none"
            />
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
              disabled={saving || !formData.customerName || !formData.customerEmail || formData.productIds.length === 0}
              className="flex-[2] bg-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={20} /> : null}
              {saving ? "Saving..." : "Create Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
