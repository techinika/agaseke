/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Loader, Package, ShoppingCart, Check, Truck, Download, Plus, Minus } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import type { CartItem, Product } from "@/components/parts/public/store/types";
import { getProductCurrency, getProductPrice } from "@/components/parts/public/store/types";
import { formatMoney as formatCurrency } from "@/lib/format/money";
import { CheckoutSheet } from "@/features/store";
import { downloadProduct } from "@/lib/downloadProduct";

const platformSharePercentage = Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.1;
const PAID_ORDER_STATUSES = new Set(["paid", "processing", "shipped", "delivered"]);

export default function ProductDetailPage({ username, productId }: { username: string; productId: string }) {
  const pathname = usePathname();
  const { user: currentUser, isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [isPurchased, setIsPurchased] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPaid, setCheckoutPaid] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (!creatorSnap.exists()) {
          setLoading(false);
          return;
        }
        setCreatorData(creatorSnap.data());

        const prodRef = doc(db, "storeProducts", productId);
        const prodSnap = await getDoc(prodRef);
        if (!prodSnap.exists()) {
          setLoading(false);
          return;
        }
        const p = { id: prodSnap.id, ...prodSnap.data() } as Product;
        setProduct(p);
        setSelectedSize(p.sizes?.[0]);
        setImgError(false);

        if (currentUser?.uid) {
          const ordersRef = collection(db, "storeOrders");
          const q = query(ordersRef, where("buyerId", "==", currentUser.uid));
          const snap = await getDocs(q);
          const found = snap.docs.find((d) => {
            const order = d.data() as any;
            if (!PAID_ORDER_STATUSES.has(order.status)) return false;
            return (
              order.items?.some((i: any) => i.product?.id === productId || i.productId === productId) ||
              order.productId === productId
            );
          });
          setIsPurchased(Boolean(found));
        } else {
          setIsPurchased(false);
        }
      } catch (e) {
        console.error("Failed to load product", e);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [username, productId, currentUser?.uid]);

  const getItemPrice = useCallback((item: CartItem) => {
    let price = getProductPrice(item.product) * item.quantity;
    if (item.product.bulkPricing && item.product.bulkPricing.length > 0) {
      const applicableBulk = item.product.bulkPricing
        .filter((b) => item.quantity >= b.minQuantity)
        .sort((a, b) => b.discountPercentage - a.discountPercentage)[0];
      if (applicableBulk) {
        price -= (price * applicableBulk.discountPercentage) / 100;
      }
    }
    return price;
  }, []);

  const handleBuyNow = () => {
    if (!product) return;
    if (product.type === "physical" && product.sizes?.length && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    setCheckoutPaid(false);
    setCheckoutOpen(true);
  };

  const handleDownload = async () => {
    if (!product) return;
    setDownloading(true);
    try {
      await downloadProduct(product.id, currentUser?.uid);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!product || !creatorData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-fg">Product not found</p>
          <Link href={`/${username}`} className="text-brand-strong font-bold mt-4 inline-block">Go Back</Link>
        </div>
      </div>
    );
  }

  const productCurrency = getProductCurrency(product);
  const basePrice = getProductPrice(product);
  const cartItem: CartItem = { product, quantity, selectedSize };
  const subtotal = getItemPrice(cartItem);
  const priceWithFee = subtotal + ((product.platformFeePayer || "buyer") === "buyer" ? subtotal * platformSharePercentage : 0);
  const unitWithFee = basePrice + ((product.platformFeePayer || "buyer") === "buyer" ? basePrice * platformSharePercentage : 0);
  const isOutOfStock = product.type === "physical" && (product.stock ?? 0) <= 0;
  const maxQty = product.type === "physical" && (product.stock ?? 0) > 0 ? product.stock : undefined;
  const activeDisplayTotal = quantity > 1 ? subtotal : basePrice;
  const activeTotalWithFee = quantity > 1 ? priceWithFee : unitWithFee;

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 sm:py-8 md:pb-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href={`/${username}/store`}
            className="flex min-h-11 items-center gap-2 text-label font-semibold text-muted-fg transition hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back to Store</span>
          </Link>
          <Link
            href={`/${username}`}
            className="text-caption font-semibold text-brand-strong hover:underline"
          >
            @{username}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="overflow-hidden rounded-card border border-line bg-surface-sunken lg:sticky lg:top-6 lg:col-span-6">
            <div className="aspect-square w-full">
              {product.imageUrl && !imgError ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="size-16 text-muted-fg" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface p-5 sm:p-8 lg:col-span-6">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-caption font-semibold uppercase tracking-wider text-muted-fg">
                <span className={product.type === "digital" ? "text-brand-strong" : "text-info"}>
                  {product.type === "digital" ? "Digital Product" : "Physical Product"}
                </span>
                {product.type === "physical" && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {(product.stock ?? 0) > 0 ? `${product.stock} in stock` : "Out of stock"}
                    </span>
                  </>
                )}
                {isPurchased && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-success">
                      <Check className="size-3.5" aria-hidden="true" /> Owned
                    </span>
                  </>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                  {product.name}
                </h1>
                <p className="mt-1 text-label text-muted-fg">
                  By{" "}
                  <Link href={`/${username}`} className="font-semibold text-fg hover:underline">
                    {creatorData.name || `@${username}`}
                  </Link>
                </p>
              </div>

              <p className="whitespace-pre-line text-body leading-relaxed text-muted-fg">
                {product.description}
              </p>

              <div className="rounded-control border border-line bg-surface-raised p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-3xl font-bold tabular-nums text-fg sm:text-4xl">
                    {formatCurrency(activeDisplayTotal, productCurrency)}
                  </div>
                  <span className="text-caption font-semibold uppercase tracking-wider text-brand-strong">
                    Charging in {productCurrency}
                  </span>
                </div>
                {(product.platformFeePayer || "buyer") === "buyer" && (
                  <p className="mt-1 text-label text-muted-fg tabular-nums">
                    Total with fee:{" "}
                    <span className="font-semibold text-fg">
                      {formatCurrency(activeTotalWithFee, productCurrency)}
                    </span>
                  </p>
                )}
              </div>

              {product.discount?.enabled && (
                <p className="text-label font-semibold text-brand-strong">
                  {product.discount.percentage}% discount included
                </p>
              )}

              {product.bulkPricing && product.bulkPricing.length > 0 && (
                <div className="space-y-1 rounded-control bg-success-bg p-4">
                  <p className="text-caption font-bold uppercase tracking-wider text-success">
                    Bulk Discounts
                  </p>
                  {product.bulkPricing.map((bulk, idx) => (
                    <p key={idx} className="text-label text-success">
                      Buy {bulk.minQuantity}+: {bulk.discountPercentage}% off
                    </p>
                  ))}
                </div>
              )}

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <p className="mb-2 text-label font-bold text-fg">Select Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-h-11 rounded-control px-4 py-2 font-bold transition ${
                          selectedSize === size
                            ? "bg-brand-strong text-on-brand"
                            : "bg-surface-sunken text-fg hover:bg-border-strong"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-line pt-4">
                {isPurchased ? (
                  <div className="flex gap-3">
                    {product.type === "digital" && (
                      <button
                        type="button"
                        disabled={downloading}
                        onClick={() => void handleDownload()}
                        className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-success py-3 font-bold text-on-success transition hover:opacity-90 disabled:opacity-50"
                      >
                        {downloading ? (
                          <Loader className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Download className="size-4" aria-hidden="true" />
                        )}
                        {downloading ? "Downloading..." : "Download"}
                      </button>
                    )}
                    {product.type === "physical" && (
                      <Link
                        href={`/${username}/store`}
                        className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-info-bg py-3 font-bold text-info transition hover:opacity-90"
                      >
                        <Truck className="size-4" aria-hidden="true" /> Track in My Orders
                      </Link>
                    )}
                  </div>
                ) : !isLoggedIn ? (
                  <Link
                    href={`/login?referral=${username}&redirect=${encodeURIComponent(pathname)}`}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand-strong py-3 font-bold text-on-brand transition hover:opacity-90"
                  >
                    <ShoppingCart className="size-4" aria-hidden="true" /> Log in to Purchase ({productCurrency})
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center rounded-control bg-surface-sunken">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-l-control transition hover:bg-border-strong"
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </button>
                      <span className="w-10 text-center font-bold tabular-nums sm:w-12">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          setQuantity(maxQty ? Math.min(maxQty, quantity + 1) : quantity + 1)
                        }
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-r-control transition hover:bg-border-strong"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={isOutOfStock}
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-brand-strong px-4 py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
                    >
                      <ShoppingCart className="size-4" aria-hidden="true" />
                      {isOutOfStock ? "Out of Stock" : `Buy Now (${productCurrency})`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact mobile sticky bar (single compact row <=15% viewport height) */}
      {!isPurchased && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-2.5 backdrop-blur-sm md:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-caption text-muted-fg">
                Charging in {productCurrency}
              </p>
              <p className="text-body font-bold tabular-nums text-fg">
                {formatCurrency(activeTotalWithFee, productCurrency)}
              </p>
            </div>
            {!isLoggedIn ? (
              <Link
                href={`/login?referral=${username}&redirect=${encodeURIComponent(pathname)}`}
                className="flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-brand-strong px-4 text-label font-bold text-on-brand"
              >
                Log in to Buy
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-brand-strong px-5 text-label font-bold text-on-brand disabled:opacity-50"
              >
                <ShoppingCart className="size-4" aria-hidden="true" />
                {isOutOfStock ? "Out of Stock" : "Buy Now"}
              </button>
            )}
          </div>
        </div>
      )}

      {checkoutOpen && (
        <CheckoutSheet
          open
          onClose={() => {
            setCheckoutOpen(false);
            if (checkoutPaid) {
              setIsPurchased(true);
            }
          }}
          cart={[cartItem]}
          creatorId={creatorData.uid || ""}
          creatorName={creatorData.name || username}
          creatorHandle={username}
          creatorPhotoURL={creatorData.profilePicture || creatorData.photoURL || null}
          creatorVerified={Boolean(creatorData.verified)}
          getItemPrice={getItemPrice}
          total={subtotal}
          currency={productCurrency}
          currentUser={currentUser}
          onPaid={() => {
            setCheckoutPaid(true);
            setIsPurchased(true);
            toast.success("Order placed successfully!");
          }}
        />
      )}
    </>
  );
}
