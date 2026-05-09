/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Loader,
  Search,
} from "lucide-react";
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
  const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month" | "year">(
    "all",
  );

  useEffect(() => {
    if (!creator?.uid) return;

    const salesRef = collection(db, "sales");
    const q = query(
      salesRef,
      where("creatorId", "==", creator.uid),
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
            const productsQuery = query(
              productsRef,
              where(documentId(), "in", batch),
            );
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
            const batch = buyerIds.slice(i, i + batchSize).filter(
              (id) => id !== "anonymous",
            );
            if (batch.length === 0) continue;

            const profilesQuery = query(
              profilesRef,
              where(documentId(), "in", batch),
            );
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
  }, [creator?.uid]);

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

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalEarnings = filteredSales.reduce(
    (sum, sale) => sum + (sale.creatorEarnings || 0),
    0,
  );
  const totalOrders = filteredSales.length;
  const uniqueBuyers = new Set(
    filteredSales.map((sale) => sale.buyerId).filter((id) => id !== "anonymous"),
  ).size;

  const productSales: Record<string, { name: string; total: number; quantity: number; earnings: number; type?: string; imageUrl?: string }> = {};
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
      };
    }
    productSales[sale.productId].total += sale.totalAmount;
    productSales[sale.productId].quantity += sale.quantity || 1;
    productSales[sale.productId].earnings += sale.creatorEarnings || 0;
  });

  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const paymentMethods: Record<string, string> = {
    card: "Card",
    momo: "Mobile Money",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">
            Sales
          </h1>
          <p className="text-slate-500 mt-1">
            Track your product sales and earnings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Sales</p>
              <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                {totalSales.toLocaleString()} RWF
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Your Earnings</p>
              <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                {totalEarnings.toLocaleString()} RWF
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Orders</p>
              <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                {totalOrders}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Unique Buyers</p>
              <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                {uniqueBuyers}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">Recent Sales</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sales..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="all">All Time</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredSales.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">No sales found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Buyer
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.slice(0, 50).map((sale) => {
                    const product = products[sale.productId];
                    const profile = profiles[sale.buyerId];
                    const buyerName = profile?.displayName || sale.buyerName || "Anonymous";
                    const productName = product?.name || sale.productName || "N/A";
                    const productType = product?.type;

                    return (
                      <tr
                        key={sale.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {product?.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={productName}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <div className="font-medium text-slate-900">
                              {productName}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {profile?.photoURL ? (
                              <img
                                src={profile.photoURL}
                                alt={buyerName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <Users className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-slate-900">
                                {buyerName}
                              </div>
                              <div className="text-sm text-slate-500">
                                {profile?.email || sale.buyerEmail || ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {sale.quantity || 1}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              productType === "digital"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {productType === "digital" ? "Digital" : "Physical"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900">
                            {sale.totalAmount?.toLocaleString() || 0} RWF
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-green-600">
                            {sale.creatorEarnings?.toLocaleString() || 0} RWF
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                            {paymentMethods[sale.paymentMethod] ||
                              sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {sale.createdAt
                            ? sale.createdAt.toDate
                              ? new Date(
                                  sale.createdAt.toDate(),
                                ).toLocaleDateString()
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
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Top Products</h2>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">No product sales yet</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div
                        className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          index === 0
                            ? "bg-orange-500 text-white"
                            : index === 1
                              ? "bg-slate-400 text-white"
                              : "bg-amber-500 text-white"
                        }`}
                      >
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{product.quantity} units sold</span>
                        <span>•</span>
                        <span
                          className={
                            product.type === "digital"
                              ? "text-blue-600"
                              : "text-amber-600"
                          }
                        >
                          {product.type === "digital" ? "Digital" : "Physical"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {product.total.toLocaleString()} RWF
                    </p>
                    <p className="text-xs text-green-600">
                      Earned: {product.earnings.toLocaleString()} RWF
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}