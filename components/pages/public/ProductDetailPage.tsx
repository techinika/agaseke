/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Loader, Package, ShoppingCart, Check, Truck, Download, Plus, Minus } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import type { Product } from "@/components/parts/public/store/types";
import { getProductCurrency, getProductPrice } from "@/components/parts/public/store/types";
import { formatMoney as formatCurrency } from "@/lib/format/money";

const platformSharePercentage = Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;

export default function ProductDetailPage({ username, productId }: { username: string; productId: string }) {
  const { user: currentUser, isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [isPurchased, setIsPurchased] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | undefined>();

  useEffect(() => {
    const fetch = async () => {
      try {
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (!creatorSnap.exists()) { setLoading(false); return; }
        setCreatorData(creatorSnap.data());

        const prodRef = doc(db, "storeProducts", productId);
        const prodSnap = await getDoc(prodRef);
        if (!prodSnap.exists()) { setLoading(false); return; }
        const p = { id: prodSnap.id, ...prodSnap.data() } as Product;
        setProduct(p);
        setSelectedSize(p.sizes?.[0]);

        if (currentUser?.uid) {
          const ordersRef = collection(db, "storeOrders");
          const q = query(ordersRef, where("buyerId", "==", currentUser.uid));
          const snap = await getDocs(q);
          const found = snap.docs.find((d) =>
            (d.data() as any).items?.some((i: any) => i.product?.id === productId || i.productId === productId),
          );
          if (found) {
            setIsPurchased(true);
            setFileUrl((found.data() as any).items?.[0]?.fileUrl);
          }
        }
      } catch (e) { console.error("Failed to load product", e); toast.error("Failed to load product"); }
      finally { setLoading(false); }
    };
    fetch();
  }, [username, productId, currentUser?.uid]);

  const handleAddToCart = () => {
    if (!product) return;
    if (product.type === "physical" && product.sizes?.length && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    const cart: any[] = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push({ product, quantity, selectedSize });
    localStorage.setItem("cart", JSON.stringify(cart));
    toast.success("Added to cart!");
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

  const creatorName = creatorData.name || "Creator";
  const basePrice = getProductPrice(product);
  const priceWithFee = basePrice + ((product.platformFeePayer || "buyer") === "buyer" ? basePrice * platformSharePercentage : 0);

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}/store`} className="flex items-center gap-2 text-muted-fg hover:text-fg transition">
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
                <span className={`text-caption font-bold px-2 py-1 rounded-full ${product.type === "digital" ? "bg-brand-soft text-brand-strong" : "bg-info-bg text-info"}`}>
                  {product.type === "digital" ? "Digital Product" : "Physical Product"}
                </span>
                {isPurchased && (
                  <span className="bg-success-bg text-success text-caption font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Check size={10} /> Owned
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-muted-fg leading-relaxed">{product.description}</p>

              <div>
                <div className="text-4xl font-bold">{formatCurrency(basePrice, getProductCurrency(product))}</div>
                {product.platformFeePayer === "buyer" && (
                  <p className="text-sm text-muted-fg mt-1">{formatCurrency(priceWithFee, getProductCurrency(product))} with platform fee</p>
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
                      <button key={size} onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 font-bold rounded-control transition ${selectedSize === size ? "bg-brand-strong text-on-brand" : "bg-surface-sunken hover:bg-border-strong"}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-line">
                {isPurchased ? (
                  <div className="flex gap-3">
                    {product.type === "digital" && fileUrl && (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-3 bg-success text-on-success rounded-control font-bold hover:bg-success transition flex items-center justify-center gap-2">
                        <Download size={18} /> Download
                      </a>
                    )}
                    {product.type === "physical" && (
                      <span className="flex-1 py-3 bg-info-bg text-info rounded-control font-bold flex items-center justify-center gap-2">
                        <Truck size={18} /> Track in My Orders
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-surface-sunken rounded-control">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 hover:bg-border-strong rounded-l-lg transition"><Minus size={16} /></button>
                      <span className="w-12 text-center font-bold">{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)}
                        className="p-3 hover:bg-border-strong rounded-r-lg transition"><Plus size={16} /></button>
                    </div>
                    <button onClick={handleAddToCart}
                      disabled={!isLoggedIn || (product.type === "physical" && product.stock <= 0)}
                      className="flex-1 py-3 bg-brand-strong text-on-brand rounded-control font-bold hover:bg-brand-strong transition disabled:opacity-50 flex items-center justify-center gap-2">
                      <ShoppingCart size={18} /> Add to Cart
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
