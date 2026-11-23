/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { sendCommsEmail } from "@/lib/commsService";
import {
  Plus,
  Package,
  FileText,
  Tag,
  ShoppingCart,
  BarChart3,
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
import {
  Product,
  Order,
  Coupon,
  getProductCurrency,
} from "@/types/store";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { SalesAnalytics } from "./SalesPage";
import {
  ProductsList,
  OrdersList,
  CouponsList,
  CouponModal,
  FoldersList,
  FolderModal,
  ProductModal,
} from "./storepage/index";

const STORE_TABS = ["products", "orders", "sales", "coupons", "folders"] as const;
type StoreTabId = (typeof STORE_TABS)[number];

export default function StorePage() {
  const { creator } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const activeTab: StoreTabId = STORE_TABS.includes(tabFromUrl as StoreTabId)
    ? (tabFromUrl as StoreTabId)
    : "products";

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

  const handleTabChange = (nextTab: string) => {
    const validTab = STORE_TABS.includes(nextTab as StoreTabId)
      ? (nextTab as StoreTabId)
      : "products";
    const params = new URLSearchParams(searchParams.toString());
    if (validTab === "products") {
      params.delete("tab");
    } else {
      params.set("tab", validTab);
    }
    const qs = params.toString();
    router.replace(qs ? `/creator/store?${qs}` : "/creator/store", { scroll: false });
  };

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
      setLoading(false);
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
    } catch {
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
    } catch {
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
      const firstProduct = products.find((p) => p.id === folderData.productIds[0]);
      data.currency = firstProduct
        ? getProductCurrency(firstProduct)
        : String(creator?.currency || "RWF").toUpperCase();

      if (editingFolder) {
        await updateDoc(doc(db, "storeFolders", editingFolder.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
        toast.success("Bundle updated!");
      } else {
        await addDoc(collection(db, "storeFolders"), {
          ...data,
          creatorId: creator?.uid,
          createdAt: serverTimestamp(),
        });
        toast.success("Bundle created!");
      }
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
      toast.error("Failed to save bundle");
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
      toast.success("Bundle deleted");
      setDeleteFolderId(null);
    } catch {
      toast.error("Failed to delete bundle");
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
        }).catch((err) => {
          console.error("Failed to send store status email", err);
        });
      }
    } catch {
      toast.error("Failed to update order");
    }
  };

  const openOrdersCount = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  ).length;

  const primaryActionByTab: Partial<
    Record<StoreTabId, { href: string; label: string }>
  > = {
    products: { href: "/creator/store/products/new", label: "Add Product" },
    orders: { href: "/creator/store/orders/new", label: "Create Order" },
    coupons: { href: "/creator/store/coupons/new", label: "Create Coupon" },
    folders: { href: "/creator/store/folders/new", label: "Create Bundle" },
  };
  const primaryAction = primaryActionByTab[activeTab];

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-6 text-fg sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-72" />
            </div>
            <Skeleton className="h-11 w-36" rounded="control" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="space-y-3 p-4">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <PageHeader
          title="Store & Sales"
          description="Manage your products, fulfill customer orders, and track store earnings."
          className="mb-6 [&_h1]:font-display [&_h1]:text-heading [&_h1]:sm:text-display"
          actions={
            primaryAction ? (
              <Link
                href={primaryAction.href}
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>{primaryAction.label}</span>
              </Link>
            ) : undefined
          }
        />

        <Tabs
          ariaLabel="Store and sales sections"
          value={activeTab}
          onChange={handleTabChange}
          items={[
            {
              id: "products",
              label: "Products",
              icon: <Package className="size-4" aria-hidden="true" />,
              badge: products.length > 0 ? products.length : undefined,
            },
            {
              id: "orders",
              label: "Orders",
              icon: <ShoppingCart className="size-4" aria-hidden="true" />,
              badge: openOrdersCount > 0 ? openOrdersCount : undefined,
            },
            {
              id: "sales",
              label: "Sales",
              icon: <BarChart3 className="size-4" aria-hidden="true" />,
            },
            {
              id: "coupons",
              label: "Coupons",
              icon: <Tag className="size-4" aria-hidden="true" />,
              badge: coupons.length > 0 ? coupons.length : undefined,
            },
            {
              id: "folders",
              label: "Bundles",
              icon: <FileText className="size-4" aria-hidden="true" />,
              badge: folders.length > 0 ? folders.length : undefined,
            },
          ]}
          className="mb-6 sm:mb-8"
        />

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
            currency={String(creator?.currency || "RWF").toUpperCase()}
          />
        )}

        {activeTab === "sales" && <SalesAnalytics embedded />}

        {activeTab === "coupons" && (
          <CouponsList
            coupons={coupons}
            onEdit={(coupon: Coupon) => setEditingCoupon(coupon)}
            onDelete={handleDeleteCoupon}
            currency={String(creator?.currency || "RWF").toUpperCase()}
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
      </div>

      {editingProduct && (
        <ProductModal
          product={editingProduct}
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
        title="Delete Bundle?"
        message="This will permanently delete this bundle. This action cannot be undone."
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
          currency={String(creator?.currency || "RWF").toUpperCase()}
        />
      )}

      {editingFolder && (
        <FolderModal
          folder={editingFolder}
          products={products}
          currency={String(creator?.currency || "RWF").toUpperCase()}
          formData={folderFormData}
          setFormData={setFolderFormData}
          onClose={() => setEditingFolder(null)}
          onSave={handleCreateFolder}
        />
      )}
    </div>
  );
}
