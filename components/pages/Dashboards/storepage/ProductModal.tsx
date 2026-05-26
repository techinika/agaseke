import React, { useState } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  FileText,
  Loader,
} from "lucide-react";
import { toast } from "sonner";
import { serverTimestamp } from "firebase/firestore";
import {
  addDoc,
  updateDoc,
  collection,
  doc,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { Product } from "@/types/store";

export default function ProductModal({
  product,
  creatorId,
  onClose,
}: {
  product: Product | null;
  creatorId: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || 0,
    type: product?.type || ("digital" as "digital" | "physical"),
    stock: product?.stock || 0,
    imageUrl: product?.imageUrl || "",
    fileUrl: product?.fileUrl || "",
    fileType:
      product?.fileType || ("pdf" as "pdf" | "video" | "audio" | "image"),
    sizes: product?.sizes || ([] as string[]),
    active: product?.active ?? true,
    discountEnabled: product?.discount?.enabled || false,
    discountPercentage: product?.discount?.percentage || 0,
    discountCode: product?.discount?.code || "",
    bulkPricing:
      product?.bulkPricing ||
      ([] as { minQuantity: number; discountPercentage: number }[]),
    platformFeePayer:
      product?.platformFeePayer || ("buyer" as "buyer" | "creator"),
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
    const formData = new FormData();
    formData.append("file", file);
    formData.append("creatorHandle", "product");

    try {
      const res = await fetch("/api/upload/content/image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
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
    const formData = new FormData();
    formData.append("file", file);
    formData.append("creatorHandle", "product");

    try {
      const endpoint = file.type.includes("video")
        ? "/api/upload/content/video"
        : "/api/upload/content/docs";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setFormData((prev) => ({
          ...prev,
          fileUrl: data.url,
          fileType: file.type.includes("video")
            ? "video"
            : file.type.includes("audio")
              ? "audio"
              : file.type.includes("image")
                ? "image"
                : "pdf",
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
    if (!formData.name || !formData.price) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    try {
      const productData: Record<string, any> = {
        creatorId,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        type: formData.type,
        active: formData.active,
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

      if (product) {
        await updateDoc(doc(db, "storeProducts", product.id), productData);
        toast.success("Product updated!");
      } else {
        const docRef = await addDoc(collection(db, "storeProducts"), {
          ...productData,
          createdAt: serverTimestamp(),
        });
        toast.success("Product created!");
      }
      onClose();
    } catch (error) {
      console.error("Save product error:", error);
      toast.error(
        `Failed to save product: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-card w-full max-w-2xl rounded-lg p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold uppercase tracking-tighter">
            {product ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="Enter product name"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
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
                className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100 h-24 resize-none"
                placeholder="Describe your product..."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Price (RWF) *
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
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="col-span-2 p-4 bg-orange-50 rounded-lg">
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

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
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
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="digital">Digital</option>
                <option value="physical">Physical</option>
              </select>
            </div>

            {formData.type === "physical" && (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
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
                    className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
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
                      className="flex-1 bg-muted p-3 rounded-lg text-sm outline-none"
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addSize())
                      }
                    />
                    <button
                      onClick={addSize}
                      className="bg-orange-100 text-orange-600 px-4 rounded-lg font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Product Image
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
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
                    <ImageIcon
                      size={32}
                      className="mx-auto text-muted-foreground mb-2"
                    />
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
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                  Digital File
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  {formData.fileUrl ? (
                    <div className="bg-green-50 text-green-600 p-3 rounded-lg inline-flex items-center gap-2">
                      <Check size={16} />
                      <span className="text-sm font-bold">
                        File uploaded successfully
                      </span>
                    </div>
                  ) : (
                    <>
                      <FileText
                        size={32}
                        className="mx-auto text-muted-foreground mb-2"
                      />
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

            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
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
                      <span className="font-bold">
                        {bulk.discountPercentage}% off
                      </span>
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
                  className="w-24 bg-muted p-3 rounded-lg text-sm outline-none"
                />
                <input
                  type="number"
                  value={newBulkDiscount || ""}
                  onChange={(e) =>
                    setNewBulkDiscount(parseInt(e.target.value) || 0)
                  }
                  placeholder="% off"
                  className="w-24 bg-muted p-3 rounded-lg text-sm outline-none"
                />
                <button
                  onClick={addBulkPricing}
                  className="bg-orange-100 text-orange-600 px-4 rounded-lg font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="col-span-2">
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
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-foreground text-white py-5 rounded-lg font-bold text-lg shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader className="animate-spin" /> : <Check size={20} />}
            {product ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
