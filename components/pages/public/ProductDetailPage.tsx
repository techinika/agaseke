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

const platformSharePercentage = Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;
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

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}/store`} className="flex min-h-11 items-center gap-2 text-muted-fg hover:text-fg transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Store</span>
          </Link>
        </div>

        <div className="bg-surface rounded-card overflow-hidden shadow-sm border border-line">
          <div className="md:flex">
            <div className="md:w-1/2 bg-surface-sunken aspect-square">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={80} className="text-muted-fg" />
                </div>
              )}
            </div>

            <div className="md:w-1/2 p-8 space-y-5">
              <div className="flex items-center gap-2">
                <span className={`text-caption font-bold uppercase tracking-wider px-2.5 py-1 rounded-control ${product.type === "digital" ? "bg-brand-soft text-brand-strong" : "bg-info-bg text-info"}`}>
                  {product.type === "digital" ? "Digital Product" : "Physical Product"}
                </span>
                {isPurchased && (
                  <span className="bg-success-bg text-success text-caption font-bold px-2.5 py-1 rounded-control flex items-center gap-1">
                    <Check size={12} /> Owned
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-muted-fg leading-relaxed">{product.description}</p>

              <div>
                <div className="text-4xl font-bold tabular-nums">{formatCurrency(quantity > 1 ? subtotal : basePrice, productCurrency)}</div>
                {(product.platformFeePayer || "buyer") === "buyer" && (
                  <p className="text-sm text-muted-fg mt-1 tabular-nums">
                    {formatCurrency(quantity > 1 ? priceWithFee : unitWithFee, productCurrency)} with platform fee
                  </p>
                )}
              </div>

              {product.discount?.enabled && (
                <div className="bg-brand-soft text-brand-strong px-3 py-2 rounded-control text-sm font-bold inline-block">
                  {product.discount.percentage}% discount applied
                </div>
              )}

              {product.bulkPricing && product.bulkPricing.length > 0 && (
                <div className="bg-success-bg rounded-control p-4 space-y-1">
                  <p className="text-xs font-bold text-success uppercase">Bulk Discounts</p>
                  {product.bulkPricing.map((bulk, idx) => (
                    <p key={idx} className="text-sm text-success">Buy {bulk.minQuantity}+: {bulk.discountPercentage}% off</p>
                  ))}
                </div>
              )}

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <p className="text-sm font-bold mb-2">Select Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-h-11 px-4 py-2 font-bold rounded-control transition ${selectedSize === size ? "bg-brand-strong text-on-brand" : "bg-surface-sunken hover:bg-border-strong"}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-line">
                {isPurchased ? (
                  <div className="flex gap-3">
                    {product.type === "digital" && (
                      <button
                        type="button"
                        disabled={downloading}
                        onClick={() => void handleDownload()}
                        className="min-h-12 flex-1 py-3 bg-success text-on-success rounded-control font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {downloading ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
                        {downloading ? "Downloading..." : "Download"}
                      </button>
                    )}
                    {product.type === "physical" && (
                      <Link
                        href={`/${username}/store`}
                        className="min-h-12 flex-1 py-3 bg-info-bg text-info rounded-control font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
                      >
                        <Truck size={18} /> Track in My Orders
                      </Link>
                    )}
                  </div>
                ) : !isLoggedIn ? (
                  <Link
                    href={`/login?referral=${username}&redirect=${encodeURIComponent(pathname)}`}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand-strong py-3 font-bold text-on-brand transition hover:opacity-90"
                  >
                    <ShoppingCart size={18} /> Log in to Purchase
                  </Link>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-surface-sunken rounded-control">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="min-h-11 min-w-11 flex items-center justify-center hover:bg-border-strong rounded-l-control transition"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-bold tabular-nums">{quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          setQuantity(maxQty ? Math.min(maxQty, quantity + 1) : quantity + 1)
                        }
                        className="min-h-11 min-w-11 flex items-center justify-center hover:bg-border-strong rounded-r-control transition"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={isOutOfStock}
                      className="min-h-12 flex-1 py-3 bg-brand-strong text-on-brand rounded-control font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      {isOutOfStock ? "Out of Stock" : "Buy Now"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
