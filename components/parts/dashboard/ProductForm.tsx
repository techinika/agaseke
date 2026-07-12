"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Check,
  FileText,
  Loader,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/uploadService";
import { serverTimestamp } from "firebase/firestore";
import {
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";

export default function ProductForm() {
  const { creator } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    priceUSD: 0,
    currency: "RWF" as "RWF" | "USD",
    type: "digital" as "digital" | "physical",
    stock: 0,
    imageUrl: "",
    fileUrl: "",
    fileType: "pdf" as "pdf" | "video" | "audio" | "image",
    sizes: [] as string[],
    active: true,
    discountEnabled: false,
    discountPercentage: 0,
    discountCode: "",
    bulkPricing: [] as { minQuantity: number; discountPercentage: number }[],
    platformFeePayer: "buyer" as "buyer" | "creator",
  });
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [newBulkMin, setNewBulkMin] = useState(0);
  const [newBulkDiscount, setNewBulkDiscount] = useState(0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await uploadFile(file, "product_thumbnail", "product");
      if (data.url) {
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
        toast.success("Image uploaded!");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await uploadFile(file, "product_content", "product");
      if (data.url) {
        const detectedType = file.type.includes("video")
          ? "video"
          : file.type.includes("audio")
            ? "audio"
            : file.type.includes("image")
              ? "image"
              : "pdf";
        setFormData((prev) => ({
          ...prev,
          fileUrl: data.url,
          fileType: detectedType,
        }));
        toast.success("File uploaded!");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!creator?.uid) { toast.error("Not authenticated"); return; }
    if (!formData.name || !formData.price) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    try {
      const productData: Record<string, any> = {
        creatorId: creator.uid,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        priceUSD: formData.currency === "USD" ? formData.priceUSD : null,
        currency: formData.currency,
        type: formData.type,
        active: formData.active,
        platformFeePayer: formData.platformFeePayer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (formData.imageUrl) productData.imageUrl = formData.imageUrl;
      if (formData.fileUrl) productData.fileUrl = formData.fileUrl;
      if (formData.type === "physical") {
        productData.stock = formData.stock || 0;
        if (formData.sizes?.length > 0) productData.sizes = formData.sizes;
      }
      if (formData.type === "digital" && formData.fileType) {
        productData.fileType = formData.fileType;
      }
      if (formData.discountEnabled && formData.discountPercentage) {
        productData.discount = {
          enabled: true,
          percentage: formData.discountPercentage,
        };
        if (formData.discountCode) {
          productData.discount.code = formData.discountCode;
        }
      }
      if (formData.bulkPricing?.length > 0) {
        productData.bulkPricing = formData.bulkPricing;
      }

      await addDoc(collection(db, "storeProducts"), productData);
      toast.success("Product created!");
      router.push("/creator/store");
    } catch (error) {
      console.error("Save product error:", error);
      toast.error(`Failed to save product: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const addSize = () => {
    if (newSize && !formData.sizes.includes(newSize)) {
      setFormData((prev) => ({ ...prev, sizes: [...prev.sizes, newSize] }));
      setNewSize("");
    }
  };

  const removeSize = (size: string) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((s) => s !== size),
    }));
  };

  const addBulkPricing = () => {
    if (newBulkMin > 0 && newBulkDiscount > 0) {
      setFormData((prev) => ({
        ...prev,
        bulkPricing: [
          ...prev.bulkPricing,
          { minQuantity: newBulkMin, discountPercentage: newBulkDiscount },
        ],
      }));
      setNewBulkMin(0);
      setNewBulkDiscount(0);
    }
  };

  const removeBulkPricing = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      bulkPricing: prev.bulkPricing.filter((_, i) => i !== index),
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
            Add Product
          </h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 space-y-8">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100 h-24 resize-none"
              placeholder="Describe your product..."
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Currency
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, currency: "RWF" }))
                }
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${
                  formData.currency === "RWF"
                    ? "bg-orange-600 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                RWF
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, currency: "USD" }))
                }
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${
                  formData.currency === "USD"
                    ? "bg-orange-600 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                USD
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Price ({formData.currency}) *
              </label>
              <input
                type="number"
                value={formData.currency === "USD" ? formData.priceUSD : formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ...(prev.currency === "USD"
                      ? { priceUSD: parseInt(e.target.value) || 0 }
                      : { price: parseInt(e.target.value) || 0 }),
                  }))
                }
                className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Product Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as "digital" | "physical",
                  }))
                }
                className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="digital">Digital</option>
                <option value="physical">Physical</option>
              </select>
            </div>
          </div>

          {formData.currency === "USD" && (
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Price (RWF)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                RWF equivalent for local payments
              </p>
            </div>
          )}

          <div className="p-4 bg-orange-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Platform Fee (10%)</p>
                <p className="text-xs text-muted-foreground">
                  Who pays the platform fee?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      platformFeePayer: "buyer",
                    }))
                  }
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    formData.platformFeePayer === "buyer"
                      ? "bg-orange-600 text-white"
                      : "bg-card text-muted-foreground border border-border"
                  }`}
                >
                  Buyer
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      platformFeePayer: "creator",
                    }))
                  }
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                    formData.platformFeePayer === "creator"
                      ? "bg-orange-600 text-white"
                      : "bg-card text-muted-foreground border border-border"
                  }`}
                >
                  Creator
                </button>
              </div>
            </div>
            {formData.price > 0 && (
              <p className="text-xs text-orange-600 mt-2">
                {formData.platformFeePayer === "buyer"
                  ? `Buyer pays ${(formData.price * 1.1).toLocaleString()} RWF (price + 10%)`
                  : `Creator receives ${(formData.price * 0.9).toLocaleString()} RWF (price - 10%)`}
              </p>
            )}
          </div>

          {formData.type === "physical" && (
            <>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      stock: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                  Sizes Available
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.sizes.map((size) => (
                    <span
                      key={size}
                      className="bg-muted px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"
                    >
                      {size}
                      <button
                        onClick={() => removeSize(size)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="Add size (e.g., S, M, L, XL)"
                    className="flex-1 bg-muted p-3 rounded-xl text-sm outline-none"
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addSize())
                    }
                  />
                  <button
                    onClick={addSize}
                    className="bg-orange-100 text-orange-600 px-4 rounded-xl font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Product Image
            </label>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              {formData.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="max-h-40 mx-auto rounded-lg"
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
                  <ImageIcon size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload a product image
                  </p>
                  <label className="cursor-pointer bg-muted px-4 py-2 rounded-lg text-sm font-bold hover:bg-muted transition inline-flex items-center gap-2">
                    <Upload size={16} />
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

          {formData.type === "digital" && (
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Digital File
              </label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                {formData.fileUrl ? (
                  <div className="bg-green-50 text-green-600 p-3 rounded-lg inline-flex items-center gap-2">
                    <Check size={16} />
                    <span className="text-sm font-bold">
                      File uploaded successfully
                    </span>
                  </div>
                ) : (
                  <>
                    <FileText size={32} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload PDF, Video, Audio, or Image
                    </p>
                    <label className="cursor-pointer bg-muted px-4 py-2 rounded-lg text-sm font-bold hover:bg-muted transition inline-flex items-center gap-2">
                      <Upload size={16} />
                      {isUploading ? "Uploading..." : "Choose File"}
                      <input
                        type="file"
                        accept=".pdf,.mp4,.mp3,.png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Bulk Pricing
            </label>
            <div className="space-y-2 mb-3">
              {formData.bulkPricing.map((bulk, idx) => (
                <div
                  key={idx}
                  className="bg-muted p-3 rounded-lg flex items-center justify-between"
                >
                  <span className="text-sm font-medium">
                    Buy {bulk.minQuantity}+:{" "}
                    <span className="font-bold">{bulk.discountPercentage}% off</span>
                  </span>
                  <button
                    onClick={() => removeBulkPricing(idx)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={newBulkMin || ""}
                onChange={(e) => setNewBulkMin(parseInt(e.target.value) || 0)}
                placeholder="Min Qty"
                className="w-24 bg-muted p-3 rounded-xl text-sm outline-none"
              />
              <input
                type="number"
                value={newBulkDiscount || ""}
                onChange={(e) =>
                  setNewBulkDiscount(parseInt(e.target.value) || 0)
                }
                placeholder="% off"
                className="w-24 bg-muted p-3 rounded-xl text-sm outline-none"
              />
              <button
                onClick={addBulkPricing}
                className="bg-orange-100 text-orange-600 px-4 rounded-xl font-bold"
              >
                Add
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() =>
                setFormData((prev) => ({ ...prev, active: !prev.active }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.active ? "bg-orange-500" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-card shadow-sm transition-transform ${
                  formData.active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm font-bold">Product Active</span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/creator/store")}
              className="flex-1 py-4 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.name || !formData.price}
              className="flex-[2] bg-foreground text-background py-4 rounded-xl font-bold text-lg hover:bg-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={20} /> : null}
              {saving ? "Saving..." : "Create Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
