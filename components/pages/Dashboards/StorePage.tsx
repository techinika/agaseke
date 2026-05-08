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
  const [activeTab, setActiveTab] = useState<
    "products" | "orders" | "coupons" | "folders"
  >("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingFolder, setEditingFolder] = useState<any | null>(null);
  const [folderFormData, setFolderFormData] = useState({
    name: "",
    description: "",
    productIds: [] as string[],
    discountEnabled: false,
    discountPercentage: 0,
    active: true,
    imageUrl: "",
    bundlePrice: 0,
  });

  useEffect(() => {
    if (!creator?.uid) return;

    const productsRef = collection(db, "storeProducts");
    const q = query(
      productsRef,
      where("creatorId", "==", creator?.uid),
      orderBy("createdAt", "desc"),
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
      where("creatorId", "==", creator?.uid),
      orderBy("createdAt", "desc"),
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
      where("creatorId", "==", creator?.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubCoupons = onSnapshot(couponsQuery, (snapshot) => {
      const couponData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Coupon[];
      setCoupons(couponData);
    });

    const foldersRef = collection(db, "storeFolders");
    const foldersQuery = query(
      foldersRef,
      where("creatorId", "==", creator?.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
      const folderData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      setFolders(folderData);
    });

    setLoading(false);

    return () => {
      unsubProducts();
      unsubOrders();
      unsubCoupons();
      unsubFolders();
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

  const handleCreateCoupon = async (couponData: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minPurchase: number;
    maxUses: number;
    productIds: string[];
    active: boolean;
  }) => {
    try {
      await addDoc(collection(db, "storeCoupons"), {
        ...couponData,
        creatorId: creator?.uid,
        usedCount: 0,
        createdAt: serverTimestamp(),
      });
      toast.success("Coupon created!");
      setShowCouponModal(false);
      setEditingCoupon(null);
    } catch (error) {
      console.error("Create coupon error:", error);
      toast.error("Failed to create coupon");
    }
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

  const handleCreateFolder = async (folderData: {
    name: string;
    description: string;
    productIds: string[];
    discountEnabled: boolean;
    discountPercentage: number;
    active: boolean;
    imageUrl: string;
    bundlePrice: number;
  }) => {
    try {
      const data: Record<string, any> = {
        name: folderData.name,
        description: folderData.description,
        productIds: folderData.productIds,
        discountEnabled: folderData.discountEnabled,
        discountPercentage: folderData.discountPercentage,
        active: folderData.active,
      };
      if (folderData.imageUrl) data.imageUrl = folderData.imageUrl;
      if (folderData.bundlePrice > 0) data.bundlePrice = folderData.bundlePrice;

      if (editingFolder) {
        await updateDoc(doc(db, "storeFolders", editingFolder.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
        toast.success("Folder updated!");
      } else {
        await addDoc(collection(db, "storeFolders"), {
          ...data,
          creatorId: creator?.uid,
          createdAt: serverTimestamp(),
        });
        toast.success("Folder created!");
      }
      setShowFolderModal(false);
      setEditingFolder(null);
      setFolderFormData({
        name: "",
        description: "",
        productIds: [],
        discountEnabled: false,
        discountPercentage: 0,
        active: true,
        imageUrl: "",
        bundlePrice: 0,
      });
    } catch (error) {
      console.error("Create folder error:", error);
      toast.error("Failed to save folder");
    }
  };

  const handleCreateOrder = async (orderData: {
    customerName: string;
    customerEmail: string;
    productIds: { productId: string; quantity: number; price: number }[];
    notes: string;
  }) => {
    try {
      const totalAmount = orderData.productIds.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      await addDoc(collection(db, "storeOrders"), {
        ...orderData,
        creatorId: creator?.uid,
        customerId: "",
        status: "pending" as const,
        totalAmount,
        paymentStatus: "unpaid" as const,
        paymentMethod: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Order created!");
      setShowCreateOrderModal(false);
    } catch (error) {
      console.error("Create order error:", error);
      toast.error("Failed to create order");
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    setDeleteFolderId(folderId);
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "storeFolders", deleteFolderId));
      toast.success("Folder deleted");
      setDeleteFolderId(null);
    } catch (error) {
      toast.error("Failed to delete folder");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: Order["status"],
  ) => {
    const order = orders.find((o) => o.id === orderId);
    try {
      await updateDoc(doc(db, "storeOrders", orderId), {
        status,
        updatedAt: serverTimestamp(),
      });
      toast.success("Order updated");

      if (order?.buyerEmail) {
        fetch("/api/comms/email/store/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerEmail: order.buyerEmail,
            buyerName: order.buyerName,
            creatorName: creator?.name || "Creator",
            orderId,
            newStatus: status,
            previousStatus: order.status,
            items: order.items,
            total: order.total,
            trackingNumber: order.trackingNumber,
          }),
        }).catch(() => {});
      }
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
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex">
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
            { id: "folders", label: "Folders", icon: FileText },
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
              {item.id === "orders" &&
                orders.filter((o) => o.status !== "delivered").length > 0 && (
                  <span className="ml-auto text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                    {orders.filter((o) => o.status !== "delivered").length}
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
            {activeTab === "folders" && "Folders"}
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
              onClick={() => {
                setEditingCoupon(null);
                setShowCouponModal(true);
              }}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Create Coupon
            </button>
          )}
          {activeTab === "folders" && (
            <button
              onClick={() => setShowFolderModal(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Create Folder
            </button>
          )}
          {activeTab === "orders" && (
            <button
              onClick={() => setShowCreateOrderModal(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Create Order
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
            onEdit={(coupon) => {
              setEditingCoupon(coupon);
              setShowCouponModal(true);
            }}
            onDelete={handleDeleteCoupon}
          />
        )}

        {activeTab === "folders" && (
          <FoldersList
            folders={folders}
            products={products}
            onEdit={(folder) => {
              setEditingFolder(folder);
              setFolderFormData({
                name: folder.name || "",
                description: folder.description || "",
                productIds: folder.productIds || [],
                discountEnabled: folder.discountEnabled || false,
                discountPercentage: folder.discountPercentage || 0,
                active: folder.active ?? true,
                imageUrl: folder.imageUrl || "",
                bundlePrice: folder.bundlePrice || 0,
              });
              setShowFolderModal(true);
            }}
            onDelete={handleDeleteFolder}
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

      <ConfirmModal
        isOpen={deleteFolderId !== null}
        onClose={() => setDeleteFolderId(null)}
        onConfirm={confirmDeleteFolder}
        title="Delete Folder?"
        message="This will permanently delete this folder. This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
        variant="danger"
      />

      {showCouponModal && (
        <CouponModal
          coupon={editingCoupon}
          products={products}
          onClose={() => {
            setShowCouponModal(false);
            setEditingCoupon(null);
          }}
          onSave={handleCreateCoupon}
        />
      )}

      {showFolderModal && (
        <FolderModal
          folder={editingFolder}
          products={products}
          formData={folderFormData}
          setFormData={setFolderFormData}
          onClose={() => {
            setShowFolderModal(false);
            setEditingFolder(null);
          }}
          onSave={handleCreateFolder}
        />
      )}

      {showCreateOrderModal && (
        <CreateOrderModal
          products={products}
          onClose={() => setShowCreateOrderModal(false)}
          onSave={handleCreateOrder}
        />
      )}
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
        <p className="text-slate-400 text-sm mt-2">
          Add your first product to start selling
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm"
        >
          <div className="aspect-square bg-slate-50 relative">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={48} className="text-slate-200" />
              </div>
            )}
            <span
              className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full ${
                product.type === "digital"
                  ? "bg-orange-100 text-orange-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
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
            <p className="text-sm text-slate-500 truncate mt-1">
              {product.description}
            </p>
            <div className="flex items-center justify-between mt-4">
              <span className="font-bold text-lg">
                {product.price.toLocaleString()} RWF
              </span>
              {product.type === "physical" && (
                <span className="text-xs text-slate-400">
                  {product.stock} in stock
                </span>
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
    if (search && order.buyerName.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-orange-100 text-orange-700",
    delivered: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-700",
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
        <ShoppingCart size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No orders yet</p>
        <p className="text-slate-400 text-sm mt-2">
          Orders will appear here when customers make purchases
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
          />
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
          <div
            key={order.id}
            className="p-6 border-b border-slate-50 last:border-0"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold">{order.buyerName}</h4>
                <p className="text-sm text-slate-500">{order.buyerEmail}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-3 py-1 rounded-full ${statusColors[order.status]}`}
              >
                {order.status.toUpperCase()}
              </span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="font-medium">
                    {item.price.toLocaleString()} RWF
                  </span>
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
                  {order.shippingAddress.fullName},{" "}
                  {order.shippingAddress.address}, {order.shippingAddress.city}
                  {order.trackingNumber && (
                    <span className="ml-2 font-bold">
                      #{order.trackingNumber}
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {order.status === "paid" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "processing")}
                  className="px-4 py-2 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  Start Processing
                </button>
              )}
              {order.status === "processing" && (
                <>
                  <button
                    onClick={() => onUpdateStatus(order.id, "shipped")}
                    className="px-4 py-2 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    Mark as Shipped
                  </button>
                  <button
                    onClick={() => onUpdateStatus(order.id, "paid")}
                    className="px-4 py-2 text-xs font-bold border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  >
                    Back to Paid
                  </button>
                </>
              )}
              {order.status === "shipped" && (
                <>
                  <button
                    onClick={() => onUpdateStatus(order.id, "delivered")}
                    className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Mark as Delivered
                  </button>
                  <button
                    onClick={() => onUpdateStatus(order.id, "processing")}
                    className="px-4 py-2 text-xs font-bold border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  >
                    Back to Processing
                  </button>
                </>
              )}
              {order.status === "delivered" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "shipped")}
                  className="px-4 py-2 text-xs font-bold border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  Back to Shipped
                </button>
              )}
              {order.status === "cancelled" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "pending")}
                  className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Reopen Order
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
  onEdit,
  onDelete,
}: {
  coupons: Coupon[];
  onEdit: (c: Coupon) => void;
  onDelete: (id: string) => void;
}) {
  if (coupons.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
        <Tag size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No coupons yet</p>
        <p className="text-slate-400 text-sm mt-2">
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
          className="bg-white rounded-lg border border-slate-100 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg font-bold text-lg">
              {coupon.code}
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                coupon.active
                  ? "bg-green-100 text-green-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {coupon.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mb-2">
            {coupon.discountType === "percentage"
              ? `${coupon.discountValue}% OFF`
              : `${coupon.discountValue.toLocaleString()} RWF OFF`}
          </p>
          {coupon.minPurchase && (
            <p className="text-xs text-slate-500 mb-2">
              Min. purchase: {coupon.minPurchase.toLocaleString()} RWF
            </p>
          )}
          <p className="text-xs text-slate-400 mb-4">
            Used {coupon.usedCount} times
            {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(coupon)}
              className="flex-1 py-2 text-xs font-bold border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition"
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

function CouponModal({
  coupon,
  products,
  onClose,
  onSave,
}: {
  coupon: Coupon | null;
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
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold">
            {coupon ? "Edit Coupon" : "Create Coupon"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Coupon Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g., SUMMER20"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Apply to Products (optional)
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Leave empty to apply to all products
            </p>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={formData.productIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">{product.name}</span>
                  <span className="text-xs text-slate-400">
                    {product.price.toLocaleString()} RWF
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-bold">Active</p>
              <p className="text-xs text-slate-500">
                Customers can use this coupon
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, active: !formData.active })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                formData.active ? "bg-green-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.active ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100">
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

function FoldersList({
  folders,
  products,
  onEdit,
  onDelete,
}: {
  folders: any[];
  products: Product[];
  onEdit: (folder: any) => void;
  onDelete: (id: string) => void;
}) {
  if (folders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
        <FileText size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No folders yet</p>
        <p className="text-slate-400 text-sm mt-2">
          Group products together for bundle sales
        </p>
      </div>
    );
  }

  const getProductNames = (productIds: string[]) => {
    return productIds
      .map((id) => products.find((p) => p.id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="bg-white rounded-lg border border-slate-100 overflow-hidden"
        >
          <div className="aspect-video bg-gradient-to-br from-orange-50 to-amber-50 relative">
            {folder.imageUrl ? (
              <img
                src={folder.imageUrl}
                alt={folder.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText size={40} className="text-slate-300" />
              </div>
            )}
            <span
              className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full ${
                folder.active
                  ? "bg-green-100 text-green-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {folder.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-lg">{folder.name}</h3>
            {folder.description && (
              <p className="text-sm text-slate-500 mt-1">{folder.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <p className="text-lg font-bold text-slate-900">
                {folder.productIds?.length || 0} products
              </p>
              {folder.discountEnabled && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {folder.discountPercentage}% OFF
                </span>
              )}
              {folder.bundlePrice > 0 && (
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  {folder.bundlePrice.toLocaleString()} RWF
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
              {getProductNames(folder.productIds || [])}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onEdit(folder)}
                className="flex-1 py-2 text-xs font-bold border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition"
              >
                <Edit size={14} className="inline mr-1" /> Edit
              </button>
              <button
                onClick={() => onDelete(folder.id)}
                className="flex-1 py-2 text-xs font-bold border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={14} className="inline mr-1" /> Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FolderModal({
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
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold">
            {folder ? "Edit Folder" : "Create Product Folder"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Folder Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Summer Bundle, Music Pack, T-Shirt Set"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What's included in this bundle..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Folder Image
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
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
                  <p className="text-xs text-slate-500 mb-3">
                    Upload a cover image for this folder
                  </p>
                  <label className="cursor-pointer bg-slate-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition inline-flex items-center gap-2">
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
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Select Products *
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Choose products to include in this folder
            </p>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={formData.productIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">{product.name}</span>
                  <span className="text-xs text-slate-400">
                    {product.price.toLocaleString()} RWF
                  </span>
                </label>
              ))}
            </div>
          </div>

          {formData.productIds.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-1">
              <p className="text-sm text-slate-500">
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
            <label className="block text-sm font-bold text-slate-700 mb-2">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
            />
            <p className="text-xs text-slate-500 mt-1">
              Set a custom price for the entire bundle instead of using the sum
              of individual product prices
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-bold">Bundle Discount</p>
              <p className="text-xs text-slate-500">
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
                formData.discountEnabled ? "bg-green-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.discountEnabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {formData.discountEnabled && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
              />
              {formData.discountPercentage > 0 && effectivePrice > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  You save: {discountAmount.toLocaleString()} RWF (
                  {formData.discountPercentage}% off)
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-bold">Active</p>
              <p className="text-xs text-slate-500">
                Customers can purchase this bundle
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, active: !formData.active })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                formData.active ? "bg-green-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.active ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100">
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

function CreateOrderModal({
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
        { productId, quantity: 1, price: product.price },
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
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold">Create Order</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              placeholder="Customer name"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Customer Email *
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) =>
                setFormData({ ...formData, customerEmail: e.target.value })
              }
              placeholder="customer@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Add Products *
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) addProduct(e.target.value);
                e.target.value = "";
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
            >
              <option value="">Select a product to add</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.price.toLocaleString()} RWF
                </option>
              ))}
            </select>
          </div>

          {formData.productIds.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Order Items
              </label>
              {formData.productIds.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{product?.name}</p>
                      <p className="text-sm text-slate-500">
                        {product?.price.toLocaleString()} RWF each
                      </p>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.productId, parseInt(e.target.value))
                      }
                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center"
                    />
                    <p className="font-bold w-24 text-right">
                      {(item.price * item.quantity).toLocaleString()} RWF
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
                {totalAmount.toLocaleString()} RWF
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Order notes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 h-20"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100">
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
      console.log(
        "Saving product with creatorId:",
        creatorId,
        "formData:",
        formData,
      );

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

      console.log("productData to save:", productData);

      if (product) {
        await updateDoc(doc(db, "storeProducts", product.id), productData);
        toast.success("Product updated!");
      } else {
        const docRef = await addDoc(collection(db, "storeProducts"), {
          ...productData,
          createdAt: serverTimestamp(),
        });
        console.log("Product created:", docRef.id);
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-lg p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold uppercase tracking-tighter">
            {product ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="Enter product name"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
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
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100 h-24 resize-none"
                placeholder="Describe your product..."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
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
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="col-span-2 p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">Platform Fee (10%)</p>
                  <p className="text-xs text-slate-500">
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
                        : "bg-white text-slate-500 border border-slate-200"
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
                        : "bg-white text-slate-500 border border-slate-200"
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
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
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
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="digital">Digital</option>
                <option value="physical">Physical</option>
              </select>
            </div>

            {formData.type === "physical" && (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
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
                    className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Sizes Available
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.sizes.map((size) => (
                      <span
                        key={size}
                        className="bg-slate-100 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"
                      >
                        {size}
                        <button
                          onClick={() => removeSize(size)}
                          className="text-slate-400 hover:text-red-500"
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
                      className="flex-1 bg-slate-50 p-3 rounded-lg text-sm outline-none"
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
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Product Image
              </label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
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
                      className="mx-auto text-slate-300 mb-2"
                    />
                    <p className="text-sm text-slate-500 mb-3">
                      Upload a product image
                    </p>
                    <label className="cursor-pointer bg-slate-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition inline-flex items-center gap-2">
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
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                  Digital File
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
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
                        className="mx-auto text-slate-300 mb-2"
                      />
                      <p className="text-sm text-slate-500 mb-3">
                        Upload PDF, Video, Audio, or Image
                      </p>
                      <label className="cursor-pointer bg-slate-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition inline-flex items-center gap-2">
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
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Bulk Pricing
              </label>
              <div className="space-y-2 mb-3">
                {formData.bulkPricing.map((bulk, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 p-3 rounded-lg flex items-center justify-between"
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
                  className="w-24 bg-slate-50 p-3 rounded-lg text-sm outline-none"
                />
                <input
                  type="number"
                  value={newBulkDiscount || ""}
                  onChange={(e) =>
                    setNewBulkDiscount(parseInt(e.target.value) || 0)
                  }
                  placeholder="% off"
                  className="w-24 bg-slate-50 p-3 rounded-lg text-sm outline-none"
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
