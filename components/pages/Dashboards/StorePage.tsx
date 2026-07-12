/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { sendCommsEmail } from "@/lib/commsService";
import {
  Plus,
  ArrowLeft,
  Loader,
  Package,
  FileText,
  Tag,
  ShoppingCart,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
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
import {
  ProductsList,
  OrdersList,
  CouponsList,
  CouponModal,
  FoldersList,
  FolderModal,
  CreateOrderModal,
  ProductModal,
} from "./storepage/index";

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
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
        sendCommsEmail("store_status", {
          buyerEmail: order.buyerEmail,
          buyerName: order.buyerName,
          creatorName: creator?.name || "Creator",
          orderId,
          newStatus: status,
          previousStatus: order.status,
          items: order.items,
          total: order.total,
          trackingNumber: order.trackingNumber,
        }).catch((err) => { console.error("Failed to send store status email", err); });
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
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 bg-card border-r border-border hidden md:block p-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold mb-6 uppercase">Store</h1>

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
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "products" && products.length > 0 && (
                <span className="ml-auto text-[10px] bg-muted px-2 py-0.5 rounded-full">
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
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {activeTab === "products" && "Products"}
            {activeTab === "orders" && "Orders"}
            {activeTab === "coupons" && "Coupons"}
            {activeTab === "folders" && "Folders"}
          </h3>
          {activeTab === "products" && (
            <Link
              href="/creator/store/products/new"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Add Product
            </Link>
          )}
          {activeTab === "coupons" && (
            <Link
              href="/creator/store/coupons/new"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Create Coupon
            </Link>
          )}
          {activeTab === "folders" && (
            <Link
              href="/creator/store/folders/new"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Create Folder
            </Link>
          )}
          {activeTab === "orders" && (
            <Link
              href="/creator/store/orders/new"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition"
            >
              <Plus size={16} /> Create Order
            </Link>
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
            onEdit={(coupon: Coupon) => {
              setEditingCoupon(coupon);
            }}
            onDelete={handleDeleteCoupon}
          />
        )}

        {activeTab === "folders" && (
          <FoldersList
            folders={folders}
            products={products}
            onEdit={(folder: any) => {
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
            }}
            onDelete={handleDeleteFolder}
          />
        )}
      </main>

      {editingProduct && (
        <ProductModal
          product={editingProduct}
          creatorId={creator?.uid || ""}
          onClose={() => setEditingProduct(null)}
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

      {editingCoupon && (
        <CouponModal
          coupon={editingCoupon}
          products={products}
          onClose={() => setEditingCoupon(null)}
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


