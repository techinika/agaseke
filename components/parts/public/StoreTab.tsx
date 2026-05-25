/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Loader,
  Truck,
  Package,
  Search,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/db/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { ProtectedSection } from "./ProtectedSection";
import {
  FolderCard,
  FolderExplorer,
  ProductCard,
  ProductDetailModal,
  CartModal,
  CheckoutModal,
  OrderTrackingModal,
  MyPurchasesModal,
} from "./store";
import type { Product, FolderData, CartItem, Order } from "./store";

function logErrorToServer(message: string, metadata?: Record<string, unknown>) {
  fetch("/api/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      level: "error",
      category: "store",
      message,
      metadata,
    }),
  }).catch(() => {});
}

interface StoreTabProps {
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  storePublic: boolean;
  isLoggedIn: boolean;
  isSupporter: boolean;
  setIsModalOpen: (open: boolean) => void;
  compact?: boolean;
}

const platformSharePercentage =
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;

export const StoreTab = ({
  creatorId,
  creatorName,
  creatorHandle,
  storePublic,
  isLoggedIn,
  isSupporter,
  setIsModalOpen,
  compact = false,
}: StoreTabProps) => {
  const { user: currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeFolder, setActiveFolder] = useState<FolderData | null>(null);
  const [purchasedProductIds, setPurchasedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [showMyPurchases, setShowMyPurchases] = useState(false);

  const canAccess = storePublic || isSupporter;

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const productsRef = collection(db, "storeProducts");
        const limitCount = compact ? 3 : 50;
        const constraints: any[] = [
          where("creatorId", "==", creatorId),
          where("active", "==", true),
          orderBy("createdAt", "desc"),
        ];
        const q = query(productsRef, ...constraints);
        const snapshot = await getDocs(q);
        let productData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        if (compact) {
          productData = productData.slice(0, limitCount);
        }
        setProducts(productData);

        if (!compact) {
          const foldersRef = collection(db, "storeFolders");
          const fq = query(
            foldersRef,
            where("creatorId", "==", creatorId),
            where("active", "==", true),
            orderBy("createdAt", "desc"),
          );
          const folderSnap = await getDocs(fq);
          const folderData = folderSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as FolderData[];
          setFolders(folderData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        logErrorToServer("Error fetching store data", {
          creatorId,
          error: String(error),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [creatorId, canAccess, compact]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchOrders = async () => {
      try {
        const ordersRef = collection(db, "storeOrders");
        const q = query(ordersRef, where("buyerId", "==", currentUser.uid));
        const snapshot = await getDocs(q);
        const orderData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        setUserOrders(orderData);

        const purchased = new Set<string>();
        for (const order of orderData) {
          if (
            order.status === "paid" ||
            order.status === "processing" ||
            order.status === "shipped" ||
            order.status === "delivered"
          ) {
            if (order.items && Array.isArray(order.items)) {
              for (const item of order.items) {
                purchased.add(item.productId);
              }
            } else if ((order as any).productId) {
              purchased.add((order as any).productId);
            }
          }
        }
        setPurchasedProductIds(purchased);
      } catch (error) {
        console.error("Error fetching orders:", error);
        logErrorToServer("Error fetching orders", {
          userId: currentUser.uid,
          error: String(error),
        });
      }
    };

    fetchOrders();
  }, [currentUser?.uid]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const addToCart = useCallback(
    (
      product: Product,
      quantity: number = 1,
      selectedSize?: string,
    ) => {
      setCart((prev) => {
        const existing = prev.find(
          (item) =>
            item.product.id === product.id && item.selectedSize === selectedSize,
        );
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id && item.selectedSize === selectedSize
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        }
        return [...prev, { product, quantity, selectedSize }];
      });
      toast.success("Added to cart!");
    },
    [],
  );

  const addFolderToCart = (folder: FolderData) => {
    const folderProducts = products.filter((p) =>
      folder.productIds.includes(p.id),
    );
    if (folderProducts.length === 0) {
      toast.error("No products available in this folder");
      return;
    }
    for (const product of folderProducts) {
      if (!purchasedProductIds.has(product.id)) {
        addToCart(product, 1);
      }
    }
    setActiveFolder(null);
  };

  const updateQuantity = useCallback(
    (
      productId: string,
      selectedSize: string | undefined,
      delta: number,
    ) => {
      setCart(
        (prev) =>
          prev
            .map((item) => {
              if (
                item.product.id === productId &&
                item.selectedSize === selectedSize
              ) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
              }
              return item;
            })
            .filter(Boolean) as CartItem[],
      );
    },
    [],
  );

  const removeFromCart = useCallback((productId: string, selectedSize?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId && item.selectedSize === selectedSize
          ),
      ),
    );
  }, []);

  const getCartTotal = useCallback(() => {
    let total = 0;
    cart.forEach((item) => {
      let itemPrice = item.product.price * item.quantity;

      if (item.product.bulkPricing && item.product.bulkPricing.length > 0) {
        const applicableBulk = item.product.bulkPricing
          .filter((b) => item.quantity >= b.minQuantity)
          .sort((a, b) => b.discountPercentage - a.discountPercentage)[0];
        if (applicableBulk) {
          const discount =
            (itemPrice * applicableBulk.discountPercentage) / 100;
          itemPrice -= discount;
        }
      }

      total += itemPrice;
    });
    return total;
  }, [cart]);

  const getItemPrice = useCallback((item: CartItem) => {
    let price = item.product.price * item.quantity;

    if (item.product.bulkPricing && item.product.bulkPricing.length > 0) {
      const applicableBulk = item.product.bulkPricing
        .filter((b) => item.quantity >= b.minQuantity)
        .sort((a, b) => b.discountPercentage - a.discountPercentage)[0];
      if (applicableBulk) {
        const discount = (price * applicableBulk.discountPercentage) / 100;
        price -= discount;
      }
    }

    return price;
  }, []);

  const getFolderTotal = useCallback((folder: FolderData) => {
    const folderProducts = products.filter(
      (p) => folder.productIds.includes(p.id) && !purchasedProductIds.has(p.id),
    );
    const total = folderProducts.reduce((sum, p) => sum + p.price, 0);
    if (folder.discountEnabled && folder.discountPercentage > 0) {
      return total - (total * folder.discountPercentage) / 100;
    }
    return total;
  }, [products, purchasedProductIds]);

  const getFolderPlatformFee = useCallback((folder: FolderData) => {
    const folderProducts = products.filter(
      (p) => folder.productIds.includes(p.id) && !purchasedProductIds.has(p.id),
    );
    let fee = 0;
    for (const product of folderProducts) {
      if ((product.platformFeePayer || "buyer") === "buyer") {
        fee += product.price * platformSharePercentage;
      }
    }
    if (folder.discountEnabled && folder.discountPercentage > 0) {
      fee = fee - (fee * folder.discountPercentage) / 100;
    }
    return fee;
  }, [products, purchasedProductIds, platformSharePercentage]);

  if (!canAccess) {
    return (
      <div className="animate-in fade-in duration-500">
        <ProtectedSection
          isLoggedIn={isLoggedIn}
          type="gift"
          hasGifted={isSupporter}
          setIsModalOpen={setIsModalOpen}
          handle={creatorHandle}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 flex items-center justify-center h-[400px]">
        <Loader className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (activeFolder) {
    const folderProducts = products.filter(
      (p) => activeFolder.productIds.includes(p.id) && p.active,
    );
    return (
      <FolderExplorer
        folder={activeFolder}
        products={folderProducts}
        purchasedProductIds={purchasedProductIds}
        onBack={() => setActiveFolder(null)}
        onAddToCart={addToCart}
        onAddFolderToCart={() => addFolderToCart(activeFolder)}
        onSelectProduct={setSelectedProduct}
        isLoggedIn={isLoggedIn}
        folderTotal={getFolderTotal(activeFolder)}
        folderPlatformFee={getFolderPlatformFee(activeFolder)}
      />
    );
  }

  if (showCart && !showCheckout) {
    const handleCheckout = () => {
      if (!currentUser?.uid) {
        toast.error("Please log in to complete your purchase");
        setIsModalOpen(true);
        return;
      }
      setShowCheckout(true);
    };
    return (
      <CartModal
        cart={cart}
        onClose={() => setShowCart(false)}
        onCheckout={handleCheckout}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        getItemPrice={getItemPrice}
        total={getCartTotal()}
      />
    );
  }

  if (showCheckout) {
    return (
      <CheckoutModal
        cart={cart}
        creatorId={creatorId}
        creatorName={creatorName}
        creatorHandle={creatorHandle}
        onClose={() => {
          setShowCheckout(false);
          setShowCart(false);
          setCart([]);
        }}
        onSuccess={() => {
          setShowCheckout(false);
          setShowCart(false);
          setCart([]);
          toast.success("Order placed successfully!");
        }}
        getItemPrice={getItemPrice}
        total={getCartTotal()}
        currentUser={currentUser}
      />
    );
  }

  if (showOrderTracking) {
    return (
      <OrderTrackingModal
        orders={userOrders}
        onClose={() => setShowOrderTracking(false)}
      />
    );
  }

  if (showMyPurchases) {
    return (
      <MyPurchasesModal
        orders={userOrders}
        products={products}
        creatorHandle={creatorHandle}
        onClose={() => setShowMyPurchases(false)}
      />
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const hasMoreProducts = products.length > 2;

  if (compact) {
    return (
      <div className="animate-in fade-in duration-500">
        {products.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
            <Package size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No products available</p>
            <p className="text-slate-400 text-sm mt-2">
              Check back later for new products
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.slice(0, 2).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                  onSelectProduct={setSelectedProduct}
                  isLoggedIn={isLoggedIn}
                  isPurchased={purchasedProductIds.has(product.id)}
                  fileUrl={product.fileUrl}
                />
              ))}
            </div>
            {hasMoreProducts && (
              <div className="mt-6 text-center">
                <Link
                  href={`/${creatorHandle}/store`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition shadow-lg"
                >
                  View All Products <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </>
        )}

        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={addToCart}
            isLoggedIn={isLoggedIn}
            isPurchased={purchasedProductIds.has(selectedProduct.id)}
            fileUrl={selectedProduct.fileUrl}
          />
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
          />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {purchasedProductIds.size > 0 && (
            <button
              onClick={() => setShowMyPurchases(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-lg text-sm font-bold hover:bg-slate-50 transition"
            >
              <Package size={16} />
              My Purchases
            </button>
          )}
          {userOrders.length > 0 && (
            <button
              onClick={() => setShowOrderTracking(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-lg text-sm font-bold hover:bg-slate-50 transition"
            >
              <Truck size={16} />
              My Orders
            </button>
          )}
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition shadow-lg"
          >
            <ShoppingCart size={18} />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 && activeFolders().length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
          <Package size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">No products available</p>
          <p className="text-slate-400 text-sm mt-2">
            Check back later for new products
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeFolders().length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
                Bundles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {activeFolders().map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    products={products}
                    purchasedProductIds={purchasedProductIds}
                    onEnter={() => setActiveFolder(folder)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div>
              {activeFolders().length > 0 && (
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
                  All Products
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    onSelectProduct={setSelectedProduct}
                    creatorHandle={creatorHandle}
                    isLoggedIn={isLoggedIn}
                    isPurchased={purchasedProductIds.has(product.id)}
                    fileUrl={product.fileUrl}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          isLoggedIn={isLoggedIn}
          isPurchased={purchasedProductIds.has(selectedProduct.id)}
          fileUrl={selectedProduct.fileUrl}
        />
      )}
    </div>
  );

  function activeFolders() {
    return folders.filter((f) => f.active);
  }
};
