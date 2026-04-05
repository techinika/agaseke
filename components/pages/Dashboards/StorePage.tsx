/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  Loader,
  X,
  Package,
  FileText,
  Tag,
  ShoppingCart,
  Truck,
  Search,
  Check,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { Product } from "@/types/store";
import { Order } from "@/types/store";
import { Coupon } from "@/types/store";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function StorePage() {
  const { creator } = useAuth();
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "coupons">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!creator?.uid) return;

    const productsRef = collection(db, "storeProducts");
    const q = query(
      productsRef,
      where("creatorId", "==", creator.uid),
      orderBy("createdAt", "desc")
    );

    const unsubProducts = onSnapshot(q, (snapshot) => {
      const productData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productData);
    });

    const ordersRef = collection(db, "storeOrders");
    const ordersQuery = query(
      ordersRef,
      where("creatorId", "==", creator.uid),
      orderBy("createdAt", "desc")
    );

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orderData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      setOrders(orderData);
    });

    const couponsRef = collection(db, "storeCoupons");
    const couponsQuery = query(
      couponsRef,
      where("creatorId", "==", creator.uid),
      orderBy("createdAt", "desc")
    );

    const unsubCoupons = onSnapshot(couponsQuery, (snapshot) => {
      const couponData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Coupon[];
      setCoupons(couponData);
    });

    setLoading(false);

    return () => {
      unsubProducts();
      unsubOrders();
      unsubCoupons();
    };
  }, [creator?.uid]);

  const handleDeleteProduct = (productId: string) => {
    setDeleteProductId(productId);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProductId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "storeProducts", deleteProductId));
      toast.success("Product deleted");
      setDeleteProductId(null);
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCoupon = (couponId: string) => {
    setDeleteCouponId(couponId);
  };

  const confirmDeleteCoupon = async () => {
    if (!deleteCouponId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "storeCoupons", deleteCouponId));
      toast.success("Coupon deleted");
      setDeleteCouponId(null);
    } catch (error) {
      toast.error("Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      await updateDoc(doc(db, "storeOrders", orderId), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast.success("Order updated");
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-xl font-bold mb-6 uppercase">Store</h2>

        <nav className="space-y-1">
          {[
            { id: "products", label: "Products", icon: Package },
            { id: "orders", label: "Orders", icon: ShoppingCart },
            { id: "coupons", label: "Coupons", icon: Tag },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-orange-50 text-orange-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "products" && products.length > 0 && (
                <span className="ml-auto text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">
                  {products.length}
                </span>
              )}
              {item.id === "orders" && orders.filter(o => o.status !== "delivered").length > 0 && (
                <span className="ml-auto text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  {orders.filter(o => o.status !== "delivered").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            {activeTab === "products" && "Products"}
            {activeTab === "orders" && "Orders"}
            {activeTab === "coupons" && "Coupons"}
          </h3>
          {activeTab === "products" && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Add Product
            </button>
          )}
          {activeTab === "coupons" && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Create Coupon
            </button>
          )}
        </div>

        {activeTab === "products" && (
          <ProductsList
            products={products}
            onEdit={setEditingProduct}
            onDelete={handleDeleteProduct}
          />
        )}

        {activeTab === "orders" && (
          <OrdersList
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

        {activeTab === "coupons" && (
          <CouponsList
            coupons={coupons}
            onDelete={handleDeleteCoupon}
          />
        )}
      </main>

      {(isCreating || editingProduct) && (
        <ProductModal
          product={editingProduct}
          creatorId={creator?.uid || ""}
          onClose={() => {
            setIsCreating(false);
            setEditingProduct(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteProductId !== null}
        onClose={() => setDeleteProductId(null)}
        onConfirm={confirmDeleteProduct}
        title="Delete Product?"
        message="This will permanently delete this product. This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={deleteCouponId !== null}
        onClose={() => setDeleteCouponId(null)}
        onConfirm={confirmDeleteCoupon}
        title="Delete Coupon?"
        message="This will permanently delete this coupon. This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

function ProductsList({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
        <Package size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No products yet</p>
        <p className="text-slate-400 text-sm mt-2">Add your first product to start selling</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg border border-slate-100 overflow-hidden">
          <div className="aspect-square bg-slate-50 relative">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={48} className="text-slate-200" />
              </div>
            )}
            <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full ${
              product.type === "digital" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
            }`}>
              {product.type === "digital" ? "Digital" : "Physical"}
            </span>
            {!product.active && (
              <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                Inactive
              </span>
            )}
          </div>
          <div className="p-4">
            <h4 className="font-bold text-lg truncate">{product.name}</h4>
            <p className="text-sm text-slate-500 truncate mt-1">{product.description}</p>
            <div className="flex items-center justify-between mt-4">
              <span className="font-bold text-lg">{product.price.toLocaleString()} RWF</span>
              {product.type === "physical" && (
                <span className="text-xs text-slate-400">{product.stock} in stock</span>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onEdit(product)}
                className="flex-1 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                <Edit size={14} className="inline mr-1" /> Edit
              </button>
              <button
                onClick={() => onDelete(product.id)}
                className="px-3 py-2 text-xs font-bold border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersList({
  orders,
  onUpdateStatus,
}: {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order["status"]) => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredOrders = orders.filter((order) => {
    if (filter !== "all" && order.status !== filter) return false;
    if (search && !order.buyerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-700",
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
        <ShoppingCart size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No orders yet</p>
        <p className="text-slate-400 text-sm mt-2">Orders will appear here when customers make purchases</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg py-3 px-4 text-sm outline-none"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
        {filteredOrders.map((order) => (
          <div key={order.id} className="p-6 border-b border-slate-50 last:border-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold">{order.buyerName}</h4>
                <p className="text-sm text-slate-500">{order.buyerEmail}</p>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${statusColors[order.status]}`}>
                {order.status.toUpperCase()}
              </span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.productName}</span>
                  <span className="font-medium">{item.price.toLocaleString()} RWF</span>
                </div>
              ))}
              <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span>{order.total.toLocaleString()} RWF</span>
              </div>
            </div>

            {order.shippingAddress && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                <Truck size={14} className="inline mr-2 text-blue-600" />
                <span className="text-blue-800">
                  {order.shippingAddress.fullName}, {order.shippingAddress.address}, {order.shippingAddress.city}
                  {order.trackingNumber && <span className="ml-2 font-bold">#{order.trackingNumber}</span>}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              {order.status === "paid" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "processing")}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Start Processing
                </button>
              )}
              {order.status === "processing" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "shipped")}
                  className="px-4 py-2 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Mark as Shipped
                </button>
              )}
              {order.status === "shipped" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "delivered")}
                  className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Mark as Delivered
                </button>
              )}
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "cancelled")}
                  className="px-4 py-2 text-xs font-bold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouponsList({
  coupons,
  onDelete,
}: {
  coupons: Coupon[];
  onDelete: (id: string) => void;
}) {
  if (coupons.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
        <Tag size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No coupons yet</p>
        <p className="text-slate-400 text-sm mt-2">Create discount coupons for your customers</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {coupons.map((coupon) => (
        <div key={coupon.id} className="bg-white rounded-lg border border-slate-100 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg font-bold text-lg">
              {coupon.code}
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              coupon.active ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"
            }`}>
              {coupon.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mb-2">
            {coupon.discountType === "percentage"
              ? `${coupon.discountValue}% OFF`
              : `${coupon.discountValue.toLocaleString()} RWF OFF`}
          </p>
          {coupon.minPurchase && (
            <p className="text-xs text-slate-500 mb-2">Min. purchase: {coupon.minPurchase.toLocaleString()} RWF</p>
          )}
          <p className="text-xs text-slate-400 mb-4">
            Used {coupon.usedCount} times{coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
          </p>
          <button
            onClick={() => onDelete(coupon.id)}
            className="w-full py-2 text-xs font-bold border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition"
          >
            <Trash2 size={14} className="inline mr-1" /> Delete
          </button>
        </div>
      ))}
    </div>
  );
}

function ProductModal({
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
    type: product?.type || "digital" as "digital" | "physical",
    stock: product?.stock || 0,
    imageUrl: product?.imageUrl || "",
    fileUrl: product?.fileUrl || "",
    fileType: product?.fileType || "pdf" as "pdf" | "video" | "audio" | "image",
    sizes: product?.sizes || [] as string[],
    active: product?.active ?? true,
    discountEnabled: product?.discount?.enabled || false,
    discountPercentage: product?.discount?.percentage || 0,
    discountCode: product?.discount?.code || "",
    bulkPricing: product?.bulkPricing || [] as { minQuantity: number; discountPercentage: number }[],
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
      const productData = {
        creatorId,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        type: formData.type,
        stock: formData.type === "physical" ? formData.stock : 0,
        imageUrl: formData.imageUrl,
        fileUrl: formData.fileUrl,
        fileType: formData.type === "digital" ? formData.fileType : undefined,
        sizes: formData.type === "physical" ? formData.sizes : undefined,
        active: formData.active,
        discount: {
          enabled: formData.discountEnabled,
          percentage: formData.discountPercentage,
          code: formData.discountCode || undefined,
        },
        bulkPricing: formData.bulkPricing,
        updatedAt: serverTimestamp(),
      };

      if (product) {
        await updateDoc(doc(db, "storeProducts", product.id), productData);
        toast.success("Product updated!");
      } else {
        await addDoc(collection(db, "storeProducts"), {
          ...productData,
          createdAt: serverTimestamp(),
        });
        toast.success("Product created!");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save product");
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
    setFormData((prev) => ({ ...prev, sizes: prev.sizes.filter((s) => s !== size) }));
  };

  const addBulkPricing = () => {
    if (newBulkMin > 0 && newBulkDiscount > 0) {
      setFormData((prev) => ({
        ...prev,
        bulkPricing: [...prev.bulkPricing, { minQuantity: newBulkMin, discountPercentage: newBulkDiscount }],
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-lg p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold uppercase tracking-tighter">
            {product ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="Enter product name"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100 h-24 resize-none"
                placeholder="Describe your product..."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Price (RWF) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Product Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as "digital" | "physical" }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="digital">Digital</option>
                <option value="physical">Physical</option>
              </select>
            </div>

            {formData.type === "physical" && (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Sizes Available</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.sizes.map((size) => (
                      <span
                        key={size}
                        className="bg-slate-100 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"
                      >
                        {size}
                        <button onClick={() => removeSize(size)} className="text-slate-400 hover:text-red-500">
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
                      className="flex-1 bg-slate-50 p-3 rounded-lg text-sm outline-none"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
                    />
                    <button onClick={addSize} className="bg-orange-100 text-orange-600 px-4 rounded-lg font-bold">
                      Add
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Product Image</label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                {formData.imageUrl ? (
                  <div className="relative inline-block">
                    <img src={formData.imageUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                    <button
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500 mb-3">Upload a product image</p>
                    <label className="cursor-pointer bg-slate-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition inline-flex items-center gap-2">
                      <Upload size={16} />
                      {isUploading ? "Uploading..." : "Choose File"}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                    </label>
                  </>
                )}
              </div>
            </div>

            {formData.type === "digital" && (
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Digital File</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                  {formData.fileUrl ? (
                    <div className="bg-green-50 text-green-600 p-3 rounded-lg inline-flex items-center gap-2">
                      <Check size={16} />
                      <span className="text-sm font-bold">File uploaded successfully</span>
                    </div>
                  ) : (
                    <>
                      <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500 mb-3">Upload PDF, Video, Audio, or Image</p>
                      <label className="cursor-pointer bg-slate-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition inline-flex items-center gap-2">
                        <Upload size={16} />
                        {isUploading ? "Uploading..." : "Choose File"}
                        <input type="file" accept=".pdf,.mp4,.mp3,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Bulk Pricing</label>
              <div className="space-y-2 mb-3">
                {formData.bulkPricing.map((bulk, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Buy {bulk.minQuantity}+: <span className="font-bold">{bulk.discountPercentage}% off</span>
                    </span>
                    <button onClick={() => removeBulkPricing(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
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
                  className="w-24 bg-slate-50 p-3 rounded-lg text-sm outline-none"
                />
                <input
                  type="number"
                  value={newBulkDiscount || ""}
                  onChange={(e) => setNewBulkDiscount(parseInt(e.target.value) || 0)}
                  placeholder="% off"
                  className="w-24 bg-slate-50 p-3 rounded-lg text-sm outline-none"
                />
                <button onClick={addBulkPricing} className="bg-orange-100 text-orange-600 px-4 rounded-lg font-bold">
                  Add
                </button>
              </div>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setFormData((prev) => ({ ...prev, active: !prev.active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.active ? "bg-orange-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
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
            className="w-full bg-slate-900 text-white py-5 rounded-lg font-bold text-lg shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader className="animate-spin" /> : <Check size={20} />}
            {product ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
