/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Loader, Package, ShoppingCart, Check, Truck, Download, Plus, Minus } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import type { Product } from "@/components/parts/public/store/types";

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
      } catch (e) { console.error(e); }
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
      <div className="min-h-screen bg-[#FBFBFC] flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <p className="text-slate-500">Product not found</p>
          <Link href={`/${username}`} className="text-orange-500 font-bold mt-4 inline-block">Go Back</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const creatorName = creatorData.name || "Creator";
  const priceWithFee = product.price + ((product.platformFeePayer || "buyer") === "buyer" ? product.price * platformSharePercentage : 0);

  return (
    <div className="min-h-screen bg-[#FBFBFC]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}/store`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Store</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
          <div className="md:flex">
            <div className="md:w-1/2 bg-slate-50 aspect-square">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={80} className="text-slate-200" />
                </div>
              )}
            </div>

            <div className="md:w-1/2 p-8 space-y-5">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${product.type === "digital" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                  {product.type === "digital" ? "Digital Product" : "Physical Product"}
                </span>
                {isPurchased && (
                  <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Check size={10} /> Owned
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-slate-600 leading-relaxed">{product.description}</p>

              <div>
                <div className="text-4xl font-bold">{product.price.toLocaleString()} RWF</div>
                {product.platformFeePayer === "buyer" && (
                  <p className="text-sm text-slate-500 mt-1">{priceWithFee.toLocaleString()} RWF with platform fee</p>
                )}
              </div>

              {product.discount?.enabled && (
                <div className="bg-orange-50 text-orange-600 px-3 py-2 rounded-lg text-sm font-bold inline-block">
                  {product.discount.percentage}% discount applied
                </div>
              )}

              {product.bulkPricing && product.bulkPricing.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 space-y-1">
                  <p className="text-xs font-bold text-green-800 uppercase">Bulk Discounts</p>
                  {product.bulkPricing.map((bulk, idx) => (
                    <p key={idx} className="text-sm text-green-700">Buy {bulk.minQuantity}+: {bulk.discountPercentage}% off</p>
                  ))}
                </div>
              )}

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <p className="text-sm font-bold mb-2">Select Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button key={size} onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 font-bold rounded-lg transition ${selectedSize === size ? "bg-orange-500 text-white" : "bg-slate-100 hover:bg-slate-200"}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                {isPurchased ? (
                  <div className="flex gap-3">
                    {product.type === "digital" && fileUrl && (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2">
                        <Download size={18} /> Download
                      </a>
                    )}
                    {product.type === "physical" && (
                      <span className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-lg font-bold flex items-center justify-center gap-2">
                        <Truck size={18} /> Track in My Orders
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 rounded-lg">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 hover:bg-slate-200 rounded-l-lg transition"><Minus size={16} /></button>
                      <span className="w-12 text-center font-bold">{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)}
                        className="p-3 hover:bg-slate-200 rounded-r-lg transition"><Plus size={16} /></button>
                    </div>
                    <button onClick={handleAddToCart}
                      disabled={!isLoggedIn || (product.type === "physical" && product.stock <= 0)}
                      className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                      <ShoppingCart size={18} /> Add to Cart
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
