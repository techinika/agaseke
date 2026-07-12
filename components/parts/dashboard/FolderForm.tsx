"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Image as ImageIcon, Loader, X } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/uploadService";
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

export default function FolderForm() {
  const { creator } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productIds: [] as string[],
    discountEnabled: false,
    discountPercentage: 0,
    active: true,
    imageUrl: "",
    bundlePrice: 0,
  });
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await uploadFile(file, "product_thumbnail", "folder");
      if (data.url) {
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
        toast.success("Image uploaded!");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!creator?.uid) { toast.error("Not authenticated"); return; }
    if (!formData.name || formData.productIds.length === 0) {
      toast.error("Please fill in required fields and select at least one product");
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, any> = {
        creatorId: creator.uid,
        name: formData.name,
        description: formData.description,
        productIds: formData.productIds,
        discountEnabled: formData.discountEnabled,
        discountPercentage: formData.discountPercentage,
        active: formData.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (formData.imageUrl) data.imageUrl = formData.imageUrl;
      if (formData.bundlePrice > 0) data.bundlePrice = formData.bundlePrice;

      await addDoc(collection(db, "storeFolders"), data);
      toast.success("Folder created!");
      router.push("/creator/store");
    } catch (error) {
      console.error("Create folder error:", error);
      toast.error("Failed to save folder");
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

  const totalPrice = formData.productIds.reduce((sum, id) => {
    const product = products.find((p) => p.id === id);
    return sum + (product ? getProductPrice(product) : 0);
  }, 0);

  const effectivePrice = formData.bundlePrice > 0 ? formData.bundlePrice : totalPrice;
  const discountAmount = formData.discountEnabled
    ? (effectivePrice * formData.discountPercentage) / 100
    : 0;

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
            Create Product Folder
          </h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 space-y-8">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Folder Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Summer Bundle, Music Pack, T-Shirt Set"
              className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What's included in this bundle..."
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100 h-24 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Folder Image
            </label>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              {formData.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="max-h-32 mx-auto rounded-lg"
                  />
                  <button
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, imageUrl: "" }))
                    }
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">
                    Upload a cover image for this folder
                  </p>
                  <label className="cursor-pointer bg-muted px-4 py-2 rounded-lg text-sm font-bold hover:bg-muted transition inline-flex items-center gap-2">
                    <Upload size={14} />
                    {isUploading ? "Uploading..." : "Choose File"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Select Products *
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose products to include in this folder
            </p>
            <div className="max-h-48 overflow-y-auto border border-border rounded-xl">
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

          {formData.productIds.length > 0 && (
            <div className="p-4 bg-muted rounded-xl space-y-1">
              <p className="text-sm text-muted-foreground">
                Sum of products: {formatCurrency(totalPrice, "RWF")}
              </p>
              {formData.bundlePrice > 0 && (
                <p className="text-sm font-bold text-orange-600">
                  Bundle price: {formatCurrency(formData.bundlePrice, "RWF")}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Fixed Bundle Price (optional)
            </label>
            <input
              type="number"
              value={formData.bundlePrice || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bundlePrice: parseInt(e.target.value) || 0,
                })
              }
              placeholder="Leave empty to use sum of product prices"
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Set a custom price for the entire bundle instead of using the sum of individual product prices
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div>
              <p className="font-bold">Bundle Discount</p>
              <p className="text-xs text-muted-foreground">
                Apply discount when buying all products together
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  discountEnabled: !formData.discountEnabled,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                formData.discountEnabled ? "bg-green-500" : "bg-border-strong"
              }`}
            >
              <div
                className={`w-5 h-5 bg-card rounded-full shadow transition-transform ${
                  formData.discountEnabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {formData.discountEnabled && (
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Discount Percentage
              </label>
              <input
                type="number"
                value={formData.discountPercentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountPercentage: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="e.g., 10 for 10%"
                className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100"
              />
              {formData.discountPercentage > 0 && effectivePrice > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  You save: {formatCurrency(discountAmount, "RWF")} ({formData.discountPercentage}% off)
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div>
              <p className="font-bold">Active</p>
              <p className="text-xs text-muted-foreground">
                Customers can purchase this bundle
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
              disabled={saving || !formData.name || formData.productIds.length === 0}
              className="flex-[2] bg-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={20} /> : null}
              {saving ? "Saving..." : "Create Folder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
