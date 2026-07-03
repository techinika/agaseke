import React, { useState } from "react";
import { X, Upload, Image as ImageIcon, Loader } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/store";

export default function FolderModal({
  folder,
  products,
  formData,
  setFormData,
  onClose,
  onSave,
}: {
  folder: any | null;
  products: Product[];
  formData: any;
  setFormData: (data: any) => void;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("creatorHandle", "folder");

    try {
      const res = await fetch("/api/upload/content/image", {
        method: "POST",
        body: uploadFormData,
      });
      const data = await res.json();
      if (data.url) {
        setFormData((prev: any) => ({ ...prev, imageUrl: data.url }));
        toast.success("Image uploaded!");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.productIds.length === 0) {
      toast.error(
        "Please fill in required fields and select at least one product",
      );
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const toggleProduct = (productId: string) => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id: string) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  const totalPrice = formData.productIds.reduce((sum: number, id: string) => {
    const product = products.find((p) => p.id === id);
    return sum + (product?.price || 0);
  }, 0);

  const effectivePrice = formData.bundlePrice > 0 ? formData.bundlePrice : totalPrice;

  const discountAmount = formData.discountEnabled
    ? (effectivePrice * formData.discountPercentage) / 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">
            {folder ? "Edit Folder" : "Create Product Folder"}
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
              Folder Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Summer Bundle, Music Pack, T-Shirt Set"
              className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3 font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What's included in this bundle..."
              className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3 h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Folder Image
            </label>
            <div className="border-2 border-dashed border-border-strong rounded-lg p-4 text-center">
              {formData.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="max-h-32 mx-auto rounded-lg"
                  />
                  <button
                    onClick={() =>
                      setFormData((prev: any) => ({ ...prev, imageUrl: "" }))
                    }
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon
                    size={28}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  <p className="text-xs text-muted-foreground mb-3">
                    Upload a cover image for this folder
                  </p>
                  <label className="cursor-pointer bg-border px-4 py-2 rounded-lg text-sm font-bold hover:bg-border-strong transition inline-flex items-center gap-2">
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
            <label className="block text-sm font-bold text-foreground mb-2">
              Select Products *
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose products to include in this folder
            </p>
            <div className="max-h-48 overflow-y-auto border border-border-strong rounded-lg">
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

          {formData.productIds.length > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <p className="text-sm text-muted-foreground">
                Sum of products: {totalPrice.toLocaleString()} RWF
              </p>
              {formData.bundlePrice > 0 && (
                <p className="text-sm font-bold text-orange-600">
                  Bundle price: {formData.bundlePrice.toLocaleString()} RWF
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
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
              className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set a custom price for the entire bundle instead of using the sum
              of individual product prices
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
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
              <label className="block text-sm font-bold text-foreground mb-2">
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
                className="w-full bg-muted border border-border-strong rounded-lg px-4 py-3"
              />
              {formData.discountPercentage > 0 && effectivePrice > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  You save: {discountAmount.toLocaleString()} RWF (
                  {formData.discountPercentage}% off)
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
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
        </div>

        <div className="p-6 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={
              saving || !formData.name || formData.productIds.length === 0
            }
            className="w-full bg-orange-600 text-white py-4 rounded-lg font-bold hover:bg-orange-700 transition disabled:opacity-50"
          >
            {saving ? (
              <Loader className="animate-spin mx-auto" />
            ) : folder ? (
              "Update Folder"
            ) : (
              "Create Folder"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
