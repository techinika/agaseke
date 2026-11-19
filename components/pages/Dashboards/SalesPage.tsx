/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Package, Users } from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  documentId,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { formatCurrency } from "@/types/currency";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  MediaImage,
  SearchInput,
  Select,
  Skeleton,
} from "@/components/ui";

interface SaleRecord {
  id: string;
  txRef: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  creatorId: string;
  creatorUid: string;
  productId: string;
  productName: string;
  quantity: number;
  productPrice: number;
  totalAmount: number;
  platformFee: number;
  creatorEarnings: number;
  referralEarnings: number;
  referralUid: string;
  status: string;
  paymentMethod: string;
  currency?: string;
  createdAt: any;
}

interface ProductInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "digital" | "physical";
  stock?: number;
  imageUrl?: string;
  fileUrl?: string;
  active: boolean;
  creatorId: string;
}

interface ProfileInfo {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  phoneNumber?: string;
  role?: string;
  handle?: string;
}

export default function SalesPage() {
  const { creator } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month" | "year">("all");

  useEffect(() => {
    if (!creator?.uid) return;

    const salesRef = collection(db, "sales");
    const q = query(
      salesRef,
      where("creatorId", "==", creator.handle),
      orderBy("createdAt", "desc"),
    );

    const unsubSales = onSnapshot(q, async (snapshot) => {
      const salesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SaleRecord[];
      setSales(salesData);

      const productIds = [
        ...new Set(salesData.map((sale) => sale.productId).filter(Boolean)),
      ];
      const buyerIds = [
        ...new Set(salesData.map((sale) => sale.buyerId).filter(Boolean)),
      ];

      if (productIds.length > 0) {
        try {
          const productsRef = collection(db, "storeProducts");
          const batchSize = 10;
          const productMap: Record<string, ProductInfo> = {};

          for (let i = 0; i < productIds.length; i += batchSize) {
            const batch = productIds.slice(i, i + batchSize);
            const productsQuery = query(productsRef, where(documentId(), "in", batch));
            const productsSnap = await getDocs(productsQuery);
            productsSnap.docs.forEach((doc) => {
              productMap[doc.id] = {
                id: doc.id,
                ...doc.data(),
              } as ProductInfo;
            });
          }
          setProducts(productMap);
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      }

      if (buyerIds.length > 0) {
        try {
          const profilesRef = collection(db, "profiles");
          const batchSize = 10;
          const profileMap: Record<string, ProfileInfo> = {};

          for (let i = 0; i < buyerIds.length; i += batchSize) {
            const batch = buyerIds
              .slice(i, i + batchSize)
              .filter((id) => id !== "anonymous");
            if (batch.length === 0) continue;

            const profilesQuery = query(profilesRef, where(documentId(), "in", batch));
            const profilesSnap = await getDocs(profilesQuery);
            profilesSnap.docs.forEach((doc) => {
              profileMap[doc.id] = {
                id: doc.id,
                ...doc.data(),
              } as ProfileInfo;
            });
          }
          setProfiles(profileMap);
        } catch (error) {
          console.error("Error fetching profiles:", error);
        }
      }

      setLoading(false);
    });

    return () => unsubSales();
  }, [creator?.uid, creator?.handle]);

  const filteredSales = sales.filter((sale) => {
    const product = products[sale.productId];
    const profile = profiles[sale.buyerId];
    const buyerName = profile?.displayName || sale.buyerName || "Anonymous";
    const buyerEmail = profile?.email || sale.buyerEmail || "";
    const productName = product?.name || sale.productName || "N/A";

    const matchesSearch =
      buyerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      buyerEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    const now = new Date();
    const saleDate = sale.createdAt?.toDate
      ? sale.createdAt.toDate()
      : new Date(sale.createdAt);

    let matchesTime = true;
    if (timeFilter === "week") {
      matchesTime = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    } else if (timeFilter === "month") {
      matchesTime = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    } else if (timeFilter === "year") {
      matchesTime = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24) <= 365;
    }

    return matchesSearch && matchesTime;
  });

  const salesByCurrency = filteredSales.reduce(
    (groups: Record<string, { total: number; earnings: number }>, sale) => {
      const cur = sale.currency || "";
      if (!groups[cur]) groups[cur] = { total: 0, earnings: 0 };
      groups[cur].total += sale.totalAmount;
      groups[cur].earnings += sale.creatorEarnings || 0;
      return groups;
    },
    {},
  );

  const totalOrders = filteredSales.length;
  const uniqueBuyers = new Set(
    filteredSales.map((sale) => sale.buyerId).filter((id) => id !== "anonymous"),
  ).size;

  const productSales: Record<
    string,
    {
      name: string;
      total: number;
      quantity: number;
      earnings: number;
      type?: string;
      imageUrl?: string;
      currencies: Record<string, number>;
    }
  > = {};
  filteredSales.forEach((sale) => {
    if (!productSales[sale.productId]) {
      const product = products[sale.productId];
      productSales[sale.productId] = {
        name: product?.name || sale.productName,
        total: 0,
        quantity: 0,
        earnings: 0,
        type: product?.type,
        imageUrl: product?.imageUrl,
        currencies: {},
      };
    }
    const cur = sale.currency || "";
    productSales[sale.productId].total += sale.totalAmount;
    productSales[sale.productId].quantity += sale.quantity || 1;
    productSales[sale.productId].earnings += sale.creatorEarnings || 0;
    productSales[sale.productId].currencies[cur] =
      (productSales[sale.productId].currencies[cur] || 0) + 1;
  });

  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({
      id,
      ...data,
      primaryCurrency:
        Object.entries(data.currencies).sort((a, b) => b[1] - a[1])[0]?.[0] || "",
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const paymentMethods: Record<string, string> = {
    card: "Card",
    momo: "Mobile Money",
  };

  if (loading) {
    return (
      <div className="min-h-screen space-y-6 bg-canvas p-4 text-fg md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="space-y-4 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-32" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="space-y-4 p-5 lg:col-span-2">
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </Card>
          <Card className="space-y-4 p-5">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-canvas p-4 text-fg md:p-6">
      <div>
        <h1 className="text-heading font-bold text-fg md:text-display">Sales</h1>
        <p className="mt-1 text-label text-muted-fg">
          Track your product sales and earnings
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label font-semibold text-muted-fg">Total Sales</p>
              <p className="mt-1 text-heading font-bold tabular-nums text-fg md:text-display">
                {Object.entries(salesByCurrency).map(([cur, data]) => (
                  <span key={cur} className="mr-2">
                    {formatCurrency(data.total, cur)}
                  </span>
                ))}
                {Object.keys(salesByCurrency).length === 0 && "0"}
              </p>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
              <DollarSign className="size-6" aria-hidden="true" />
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label font-semibold text-muted-fg">Your Earnings</p>
              <p className="mt-1 text-heading font-bold tabular-nums text-fg md:text-display">
                {Object.entries(salesByCurrency).map(([cur, data]) => (
                  <span key={cur} className="mr-2">
                    {formatCurrency(data.earnings, cur)}
                  </span>
                ))}
                {Object.keys(salesByCurrency).length === 0 && "0"}
              </p>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-success-bg text-success">
              <TrendingUp className="size-6" aria-hidden="true" />
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label font-semibold text-muted-fg">Total Orders</p>
              <p className="mt-1 text-heading font-bold tabular-nums text-fg md:text-display">
                {totalOrders}
              </p>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-info-bg text-info">
              <Package className="size-6" aria-hidden="true" />
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label font-semibold text-muted-fg">Unique Buyers</p>
              <p className="mt-1 text-heading font-bold tabular-nums text-fg md:text-display">
                {uniqueBuyers}
              </p>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-warning-bg text-warning">
              <Users className="size-6" aria-hidden="true" />
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-line p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-title font-bold text-fg">Recent Sales</h2>
              <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                  aria-label="Search sales..."
                  placeholder="Search sales..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  containerClassName="w-full md:w-64"
                />
                <Select
                  aria-label="Time filter"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  containerClassName="w-full md:w-40"
                >
                  <option value="all">All Time</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredSales.length === 0 ? (
              <EmptyState
                icon={<Package className="size-6" aria-hidden="true" />}
                title="No sales found"
                description=""
                className="m-4"
              />
            ) : (
              <table className="w-full">
                <thead className="bg-surface-sunken">
                  <tr>
                    <th className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-fg">
                      Product
                    </th>
                    <th className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-fg">
                      Buyer
                    </th>
                    <th className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-fg">
                      Qty
                    </th>
                    <th className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-fg">
                      Type
                    </th>
                    <th className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-fg">
                      Total
                    </th>
                    <th className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-fg">
                      Earnings
                    </th>
                    <th className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-fg">
                      Method
                    </th>
                    <th className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-wider text-muted-fg">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredSales.slice(0, 50).map((sale) => {
                    const product = products[sale.productId];
                    const profile = profiles[sale.buyerId];
                    const buyerName =
                      profile?.displayName || sale.buyerName || "Anonymous";
                    const productName = product?.name || sale.productName || "N/A";
                    const productType = product?.type;

                    return (
                      <tr
                        key={sale.id}
                        className="transition-colors hover:bg-surface-sunken"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {product?.imageUrl ? (
                              <MediaImage
                                src={product.imageUrl}
                                alt={productName}
                                aspectRatio="1 / 1"
                                sizes="40px"
                                unoptimized
                                className="size-10 shrink-0 rounded-control"
                              />
                            ) : (
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-raised text-muted-fg">
                                <Package className="size-5" aria-hidden="true" />
                              </span>
                            )}
                            <span className="font-semibold text-fg">{productName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar src={profile?.photoURL} name={buyerName} size="sm" />
                            <div className="min-w-0">
                              <div className="font-semibold text-fg">{buyerName}</div>
                              <div className="text-label text-muted-fg">
                                {profile?.email || sale.buyerEmail || ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-fg">{sale.quantity || 1}</td>
                        <td className="px-5 py-4">
                          <Badge tone={productType === "digital" ? "info" : "warning"}>
                            {productType === "digital" ? "Digital" : "Physical"}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold tabular-nums text-fg">
                            {formatCurrency(sale.totalAmount ?? 0, sale.currency || "")}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold tabular-nums text-success">
                            {formatCurrency(
                              sale.creatorEarnings ?? 0,
                              sale.currency || "",
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge>
                            {paymentMethods[sale.paymentMethod] || sale.paymentMethod}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-label text-muted-fg">
                          {sale.createdAt
                            ? sale.createdAt.toDate
                              ? new Date(sale.createdAt.toDate()).toLocaleDateString()
                              : new Date(sale.createdAt).toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="text-title font-bold text-fg">Top Products</h2>
          </div>

          {topProducts.length === 0 ? (
            <EmptyState
              icon={<Package className="size-6" aria-hidden="true" />}
              title="No product sales yet"
              description=""
              className="m-5"
            />
          ) : (
            <div className="space-y-4 p-5">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-control bg-surface-sunken p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      {product.imageUrl ? (
                        <MediaImage
                          src={product.imageUrl}
                          alt={product.name}
                          aspectRatio="1 / 1"
                          sizes="48px"
                          unoptimized
                          className="size-12 rounded-control"
                        />
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-control bg-line-strong text-muted-fg">
                          <Package className="size-6" aria-hidden="true" />
                        </span>
                      )}
                      <span
                        className={`absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-pill text-caption font-bold ${
                          index === 0
                            ? "bg-brand-strong text-on-brand"
                            : index === 1
                              ? "bg-surface-raised text-fg"
                              : "bg-warning-bg text-warning"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-label font-semibold text-fg">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 text-caption text-muted-fg">
                        <span>{product.quantity} units sold</span>
                        <span aria-hidden="true">•</span>
                        <span
                          className={
                            product.type === "digital" ? "text-info" : "text-warning"
                          }
                        >
                          {product.type === "digital" ? "Digital" : "Physical"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-fg">
                      {formatCurrency(product.total, product.primaryCurrency)}
                    </p>
                    <p className="text-caption text-success">
                      Earned: {formatCurrency(product.earnings, product.primaryCurrency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
