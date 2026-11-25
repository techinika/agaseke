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
import { resolveHistoricalCurrency } from "@/lib/money/historicalCurrency";
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

export function SalesAnalytics({ embedded = false }: { embedded?: boolean }) {
  const { creator } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month" | "year">("all");

  useEffect(() => {
    if (!creator?.handle) return;

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
  }, [creator?.handle]);

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
      const cur = resolveHistoricalCurrency(sale as unknown as Record<string, unknown>);
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
    const cur = resolveHistoricalCurrency(sale as unknown as Record<string, unknown>);
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
      <div className={embedded ? "space-y-6" : "min-h-screen space-y-6 bg-canvas p-4 text-fg md:p-6"}>
        {!embedded && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="space-y-4 p-5 lg:col-span-2">
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </Card>
          <Card className="space-y-4 p-5">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </Card>
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-display text-heading font-bold text-fg md:text-display">
            Sales
          </h1>
          <p className="mt-1 text-label text-muted-fg">
            Track your product sales and earnings
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-muted-fg">Total Sales</p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-title font-bold tabular-nums text-fg">
                {Object.entries(salesByCurrency).map(([cur, data]) => (
                  <span key={cur}>{formatCurrency(data.total, cur)}</span>
                ))}
                {Object.keys(salesByCurrency).length === 0 && <span>0</span>}
              </div>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
              <DollarSign className="size-5" aria-hidden="true" />
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-muted-fg">Your Earnings</p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-title font-bold tabular-nums text-fg">
                {Object.entries(salesByCurrency).map(([cur, data]) => (
                  <span key={cur}>{formatCurrency(data.earnings, cur)}</span>
                ))}
                {Object.keys(salesByCurrency).length === 0 && <span>0</span>}
              </div>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-success-bg text-success">
              <TrendingUp className="size-5" aria-hidden="true" />
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-muted-fg">Total Orders</p>
              <p className="mt-1.5 text-title font-bold tabular-nums text-fg">
                {totalOrders}
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-info-bg text-info">
              <Package className="size-5" aria-hidden="true" />
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-muted-fg">Unique Buyers</p>
              <p className="mt-1.5 text-title font-bold tabular-nums text-fg">
                {uniqueBuyers}
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-warning-bg text-warning">
              <Users className="size-5" aria-hidden="true" />
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-line p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-title font-bold text-fg">Recent Sales</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchInput
                  aria-label="Search sales"
                  placeholder="Search product or buyer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  containerClassName="w-full sm:w-56"
                />
                <Select
                  aria-label="Time filter"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  containerClassName="w-full sm:w-36"
                >
                  <option value="all">All Time</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </Select>
              </div>
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <EmptyState
              icon={<Package className="size-6" aria-hidden="true" />}
              title="No sales found"
              description={
                searchQuery || timeFilter !== "all"
                  ? "Try clearing your search or selecting a broader time range."
                  : "Completed purchases from your store will appear here."
              }
              className="m-4"
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="divide-y divide-line md:hidden">
                {filteredSales.slice(0, 50).map((sale) => {
                  const product = products[sale.productId];
                  const profile = profiles[sale.buyerId];
                  const buyerName =
                    profile?.displayName || sale.buyerName || "Anonymous";
                  const productName = product?.name || sale.productName || "N/A";
                  const dateLabel = sale.createdAt
                    ? sale.createdAt.toDate
                      ? new Date(sale.createdAt.toDate()).toLocaleDateString()
                      : new Date(sale.createdAt).toLocaleDateString()
                    : "N/A";

                  return (
                    <div key={sale.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
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
                          <div className="min-w-0">
                            <p className="truncate text-label font-bold text-fg">
                              {productName}
                            </p>
                            <p className="truncate text-caption text-muted-fg">
                              {buyerName} · {sale.quantity || 1}x
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-label font-bold tabular-nums text-fg">
                            {formatCurrency(
                              sale.totalAmount ?? 0,
                              resolveHistoricalCurrency(sale as unknown as Record<string, unknown>),
                            )}
                          </p>
                          <p className="text-caption font-semibold tabular-nums text-success">
                            +
                            {formatCurrency(
                              sale.creatorEarnings ?? 0,
                              resolveHistoricalCurrency(sale as unknown as Record<string, unknown>),
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-caption text-muted-fg">
                        <span>
                          {paymentMethods[sale.paymentMethod] || sale.paymentMethod}
                        </span>
                        <span className="tabular-nums">{dateLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden min-w-0 overflow-x-auto md:block">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-surface-sunken">
                    <tr>
                      <th className="px-3 py-3 text-left text-caption font-semibold text-muted-fg lg:px-4">
                        Product
                      </th>
                      <th className="px-3 py-3 text-left text-caption font-semibold text-muted-fg lg:px-4">
                        Buyer
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-right text-caption font-semibold text-muted-fg lg:px-4">
                        Qty
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-right text-caption font-semibold text-muted-fg lg:px-4">
                        Total
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-right text-caption font-semibold text-muted-fg lg:px-4">
                        Earned
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-left text-caption font-semibold text-muted-fg lg:px-4">
                        Method
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 text-right text-caption font-semibold text-muted-fg lg:px-4">
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
                          <td className="max-w-52 px-3 py-3.5 lg:px-4">
                            <div className="flex items-center gap-3">
                              {product?.imageUrl ? (
                                <MediaImage
                                  src={product.imageUrl}
                                  alt={productName}
                                  aspectRatio="1 / 1"
                                  sizes="36px"
                                  unoptimized
                                  className="size-9 shrink-0 rounded-control"
                                />
                              ) : (
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-raised text-muted-fg">
                                  <Package className="size-4" aria-hidden="true" />
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-fg">
                                  {productName}
                                </p>
                                <p className="text-caption text-muted-fg">
                                  {productType === "digital" ? "Digital" : "Physical"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-52 px-3 py-3.5 lg:px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar src={profile?.photoURL} name={buyerName} size="sm" className="shrink-0" />
                              <div className="min-w-0">
                                <p className="truncate text-label font-semibold text-fg">
                                  {buyerName}
                                </p>
                                {(profile?.email || sale.buyerEmail) && (
                                  <p className="truncate text-caption text-muted-fg">
                                    {profile?.email || sale.buyerEmail}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-muted-fg lg:px-4">
                            {sale.quantity || 1}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold tabular-nums text-fg lg:px-4">
                            {formatCurrency(
                              sale.totalAmount ?? 0,
                              resolveHistoricalCurrency(sale as unknown as Record<string, unknown>),
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold tabular-nums text-success lg:px-4">
                            {formatCurrency(
                              sale.creatorEarnings ?? 0,
                              resolveHistoricalCurrency(sale as unknown as Record<string, unknown>),
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 lg:px-4">
                            <Badge>
                              {paymentMethods[sale.paymentMethod] || sale.paymentMethod}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right text-caption tabular-nums text-muted-fg lg:px-4">
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
              </div>
            </>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="font-display text-title font-bold text-fg">Top Products</h2>
          </div>

          {topProducts.length === 0 ? (
            <EmptyState
              icon={<Package className="size-6" aria-hidden="true" />}
              title="No product sales yet"
              description="Your best-selling items will rank here once orders are paid."
              className="m-5"
            />
          ) : (
            <div className="divide-y divide-line">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 shrink-0 text-center font-mono text-caption font-bold tabular-nums text-muted-fg">
                      0{index + 1}
                    </span>
                    {product.imageUrl ? (
                      <MediaImage
                        src={product.imageUrl}
                        alt={product.name}
                        aspectRatio="1 / 1"
                        sizes="44px"
                        unoptimized
                        className="size-11 shrink-0 rounded-control"
                      />
                    ) : (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface-raised text-muted-fg">
                        <Package className="size-5" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-label font-semibold text-fg">
                        {product.name}
                      </p>
                      <p className="text-caption text-muted-fg">
                        {product.quantity} sold ·{" "}
                        {product.type === "digital" ? "Digital" : "Physical"}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold tabular-nums text-fg">
                      {formatCurrency(product.total, product.primaryCurrency)}
                    </p>
                    <p className="text-caption tabular-nums text-success">
                      +{formatCurrency(product.earnings, product.primaryCurrency)}
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

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-canvas p-4 text-fg md:p-6">
      <div className="mx-auto max-w-6xl">{content}</div>
    </div>
  );
}

export default function SalesPage() {
  return <SalesAnalytics />;
}
