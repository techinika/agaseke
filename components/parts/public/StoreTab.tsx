/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  Store,
  Plus,
  Minus,
  ShoppingCart,
  X,
  Loader,
  Check,
  Truck,
  Package,
  CreditCard,
  Tag,
  Search,
  Download,
  Lock,
  AlertCircle,
  Folder,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/db/firebase";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { Product, CartItem, Order, ShippingAddress } from "@/types/store";
import { ProtectedSection } from "./ProtectedSection";

interface StoreTabProps {
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  storePublic: boolean;
  isLoggedIn: boolean;
  isSupporter: boolean;
  setIsModalOpen: (open: boolean) => void;
}

interface FolderData {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  discountEnabled: boolean;
  discountPercentage: number;
  active: boolean;
  imageUrl?: string;
  creatorId: string;
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
  const [processing, setProcessing] = useState(false);
  const [activeFolder, setActiveFolder] = useState<FolderData | null>(null);
  const [purchasedProductIds, setPurchasedProductIds] = useState<Set<string>>(
    new Set(),
  );

  const canAccess = storePublic || isSupporter;

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const productsRef = collection(db, "storeProducts");
        const q = query(
          productsRef,
          where("creatorId", "==", creatorId),
          where("active", "==", true),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        const productData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(productData);

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
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [creatorId, canAccess]);

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
            for (const item of order.items) {
              purchased.add(item.productId);
            }
          }
        }
        setPurchasedProductIds(purchased);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, [currentUser?.uid]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const addToCart = (
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
  };

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

  const updateQuantity = (
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
  };

  const removeFromCart = (productId: string, selectedSize?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId && item.selectedSize === selectedSize
          ),
      ),
    );
  };

  const getCartTotal = () => {
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
  };

  const getItemPrice = (item: CartItem) => {
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
  };

  const getFolderTotal = (folder: FolderData) => {
    const folderProducts = products.filter(
      (p) => folder.productIds.includes(p.id) && !purchasedProductIds.has(p.id),
    );
    const total = folderProducts.reduce((sum, p) => sum + p.price, 0);
    if (folder.discountEnabled && folder.discountPercentage > 0) {
      return total - (total * folder.discountPercentage) / 100;
    }
    return total;
  };

  const getFolderPlatformFee = (folder: FolderData) => {
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
  };

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
        currentUser={currentUser}
      />
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const activeFolders = folders.filter((f) => f.active);
  const hasContent = filteredProducts.length > 0 || activeFolders.length > 0;

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

        <div className="flex items-center gap-3">
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

      {!hasContent ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
          <Package size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">No products available</p>
          <p className="text-slate-400 text-sm mt-2">
            Check back later for new products
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeFolders.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
                Bundles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {activeFolders.map((folder) => (
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
              {activeFolders.length > 0 && (
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
};

function FolderCard({
  folder,
  products,
  purchasedProductIds,
  onEnter,
}: {
  folder: FolderData;
  products: Product[];
  purchasedProductIds: Set<string>;
  onEnter: () => void;
}) {
  const folderProducts = products.filter((p) =>
    folder.productIds.includes(p.id),
  );
  const unpurchased = folderProducts.filter(
    (p) => !purchasedProductIds.has(p.id),
  );
  const totalPrice = unpurchased.reduce((sum, p) => {
    let price = p.price;
    if ((p.platformFeePayer || "buyer") === "buyer") {
      price += price * platformSharePercentage;
    }
    return sum + price;
  }, 0);
  const discountedPrice = folder.discountEnabled
    ? totalPrice - (totalPrice * folder.discountPercentage) / 100
    : totalPrice;

  return (
    <div
      onClick={onEnter}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
    >
      <div className="aspect-square bg-gradient-to-br from-orange-50 to-amber-50 relative flex items-center justify-center">
        {folder.imageUrl ? (
          <img
            src={folder.imageUrl}
            alt={folder.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <FolderOpen size={64} className="text-orange-300 mx-auto mb-2" />
            <p className="text-orange-400 font-bold text-sm">
              {folderProducts.length} items
            </p>
          </div>
        )}
        <div className="absolute top-3 left-3 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full">
          Bundle
        </div>
        {folder.discountEnabled && (
          <div className="absolute top-3 right-3 bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full">
            {folder.discountPercentage}% OFF
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{folder.name}</h3>
        {folder.description && (
          <p className="text-sm text-slate-500 line-clamp-2 mt-1">
            {folder.description}
          </p>
        )}
        <div className="mt-3 space-y-1">
          {folderProducts.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-slate-600 truncate flex-1">{p.name}</span>
              <span
                className={`font-medium ml-2 ${purchasedProductIds.has(p.id) ? "text-green-500" : "text-slate-900"}`}
              >
                {purchasedProductIds.has(p.id)
                  ? "Owned"
                  : `${p.price.toLocaleString()} RWF`}
              </span>
            </div>
          ))}
          {folderProducts.length > 3 && (
            <p className="text-xs text-slate-400">
              +{folderProducts.length - 3} more items
            </p>
          )}
        </div>
        {unpurchased.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900">
                {discountedPrice.toLocaleString()} RWF
              </p>
              {folder.discountEnabled && (
                <p className="text-xs text-green-600 font-bold">
                  {folder.discountPercentage}% bundle discount
                </p>
              )}
            </div>
            <span className="flex items-center gap-1 text-orange-600 text-sm font-bold group-hover:gap-2 transition-all">
              Open <ChevronRight size={16} />
            </span>
          </div>
        )}
        {unpurchased.length === 0 && (
          <div className="mt-4">
            <span className="text-green-600 font-bold text-sm flex items-center gap-1">
              <Check size={16} /> All items owned
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderExplorer({
  folder,
  products,
  purchasedProductIds,
  onBack,
  onAddToCart,
  onAddFolderToCart,
  onSelectProduct,
  isLoggedIn,
  folderTotal,
  folderPlatformFee,
}: {
  folder: FolderData;
  products: Product[];
  purchasedProductIds: Set<string>;
  onBack: () => void;
  onAddToCart: (product: Product, quantity?: number, size?: string) => void;
  onAddFolderToCart: () => void;
  onSelectProduct: (product: Product) => void;
  isLoggedIn: boolean;
  folderTotal: number;
  folderPlatformFee: number;
}) {
  const unpurchased = products.filter((p) => !purchasedProductIds.has(p.id));
  const totalWithFee = folderTotal + folderPlatformFee;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-xl font-bold">{folder.name}</h2>
          {folder.description && (
            <p className="text-sm text-slate-500">{folder.description}</p>
          )}
        </div>
      </div>

      {unpurchased.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900">
                Bundle Total: {folderTotal.toLocaleString()} RWF
              </p>
              {folderPlatformFee > 0 && (
                <p className="text-xs text-slate-500">
                  + Platform fee: {folderPlatformFee.toLocaleString()} RWF
                </p>
              )}
              {folderPlatformFee > 0 && (
                <p className="text-sm font-bold text-orange-600">
                  Total: {totalWithFee.toLocaleString()} RWF
                </p>
              )}
              {folder.discountEnabled && (
                <p className="text-xs text-green-600 font-bold">
                  {folder.discountPercentage}% bundle discount applied
                </p>
              )}
            </div>
            <button
              onClick={onAddFolderToCart}
              disabled={!isLoggedIn}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <ShoppingCart size={16} />
              Buy Bundle
            </button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
          <Package size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">
            No products in this bundle
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onSelectProduct={onSelectProduct}
              isLoggedIn={isLoggedIn}
              isPurchased={purchasedProductIds.has(product.id)}
              fileUrl={product.fileUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onAddToCart,
  onSelectProduct,
  isLoggedIn,
  isPurchased,
  fileUrl,
}: {
  product: Product;
  onAddToCart: (product: Product, quantity?: number, size?: string) => void;
  onSelectProduct: (product: Product) => void;
  isLoggedIn: boolean;
  isPurchased: boolean;
  fileUrl?: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes?.[0],
  );
  const isOutOfStock = product.type === "physical" && product.stock <= 0;

  const priceWithFee =
    product.price +
    ((product.platformFeePayer || "buyer") === "buyer"
      ? product.price * platformSharePercentage
      : 0);

  const handleAdd = () => {
    if (!isLoggedIn) return;
    if (
      product.type === "physical" &&
      product.sizes &&
      product.sizes.length > 0 &&
      !selectedSize
    ) {
      toast.error("Please select a size");
      return;
    }
    onAddToCart(product, quantity, selectedSize);
    setQuantity(1);
  };

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all ${isPurchased ? "border-green-200" : "border-slate-100"}`}
    >
      <div
        className="aspect-square bg-slate-50 relative cursor-pointer"
        onClick={() => onSelectProduct(product)}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} className="text-slate-200" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full ${
            product.type === "digital"
              ? "bg-orange-100 text-orange-600"
              : "bg-blue-100 text-blue-600"
          }`}
        >
          {product.type === "digital" ? "Digital" : "Physical"}
        </span>
        {isPurchased && (
          <span className="absolute top-3 right-3 bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Check size={10} /> Owned
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{product.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2 mt-1">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-xl font-bold">
              {product.price.toLocaleString()} RWF
            </span>
            {product.platformFeePayer === "buyer" && (
              <p className="text-[10px] text-slate-400">
                +{platformSharePercentage * 100}% fee ={" "}
                {priceWithFee.toLocaleString()} RWF
              </p>
            )}
          </div>
          {product.discount?.enabled && (
            <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full">
              {product.discount.percentage}% OFF
            </span>
          )}
        </div>

        {product.sizes && product.sizes.length > 0 && (
          <div className="flex gap-1 mt-3">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  selectedSize === size
                    ? "bg-orange-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {product.type === "physical" && (
          <p className="text-xs text-slate-400 mt-2">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>
        )}

        {isPurchased ? (
          <div className="flex gap-2 mt-4">
            {product.type === "digital" && fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition flex items-center justify-center gap-2"
              >
                <Download size={14} /> Download
              </a>
            )}
            {product.type === "physical" && (
              <span className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                <Truck size={14} /> Track Order
              </span>
            )}
            {product.type === "digital" && !fileUrl && (
              <span className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                <Check size={14} /> Purchased
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center bg-slate-100 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-slate-200 rounded-l-lg transition"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 hover:bg-slate-200 rounded-r-lg transition"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={isOutOfStock || !isLoggedIn}
              className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {!isLoggedIn ? (
                <>
                  <Lock size={14} /> Login to Buy
                </>
              ) : (
                <>
                  <ShoppingCart size={14} /> Add
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  isLoggedIn,
  isPurchased,
  fileUrl,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number, size?: string) => void;
  isLoggedIn: boolean;
  isPurchased: boolean;
  fileUrl?: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes?.[0],
  );

  const priceWithFee =
    product.price +
    ((product.platformFeePayer || "buyer") === "buyer"
      ? product.price * platformSharePercentage
      : 0);

  const handleAdd = () => {
    if (
      product.type === "physical" &&
      product.sizes &&
      product.sizes.length > 0 &&
      !selectedSize
    ) {
      toast.error("Please select a size");
      return;
    }
    onAddToCart(product, quantity, selectedSize);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="md:flex">
          <div className="md:w-1/2 bg-slate-50 aspect-square">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={64} className="text-slate-200" />
              </div>
            )}
          </div>

          <div className="md:w-1/2 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  product.type === "digital"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {product.type === "digital"
                  ? "Digital Product"
                  : "Physical Product"}
              </span>
              {isPurchased && (
                <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Check size={10} /> Owned
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-slate-600">{product.description}</p>

            <div>
              <div className="text-3xl font-bold">
                {product.price.toLocaleString()} RWF
              </div>
              {product.platformFeePayer === "buyer" && (
                <p className="text-xs text-slate-500 mt-1">
                  {priceWithFee.toLocaleString()} RWF with platform fee
                </p>
              )}
            </div>

            {product.discount?.enabled && (
              <div className="bg-orange-50 text-orange-600 px-3 py-2 rounded-lg text-sm font-bold inline-block">
                {product.discount.percentage}% discount applied
              </div>
            )}

            {product.bulkPricing && product.bulkPricing.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-bold text-green-800 uppercase">
                  Bulk Discounts
                </p>
                {product.bulkPricing.map((bulk, idx) => (
                  <p key={idx} className="text-sm text-green-700">
                    Buy {bulk.minQuantity}+: {bulk.discountPercentage}% off
                  </p>
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
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 font-bold rounded-lg transition ${
                        selectedSize === size
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isPurchased ? (
              <div className="flex gap-3">
                {product.type === "digital" && fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2"
                  >
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
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-slate-200 rounded-l-lg transition"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-slate-200 rounded-r-lg transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={
                    !isLoggedIn ||
                    (product.type === "physical" && product.stock <= 0)
                  }
                  className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Add to Cart
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartModal({
  cart,
  onClose,
  onCheckout,
  onUpdateQuantity,
  onRemove,
  getItemPrice,
  total,
}: {
  cart: CartItem[];
  onClose: () => void;
  onCheckout: () => void;
  onUpdateQuantity: (
    id: string,
    size: string | undefined,
    delta: number,
  ) => void;
  onRemove: (id: string, size?: string) => void;
  getItemPrice: (item: CartItem) => number;
  total: number;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedSize}`}
                className="flex gap-4 p-4 bg-slate-50 rounded-xl"
              >
                <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={24} className="text-slate-200" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{item.product.name}</h4>
                  {item.selectedSize && (
                    <p className="text-xs text-slate-500">
                      Size: {item.selectedSize}
                    </p>
                  )}
                  <p className="text-sm text-orange-600 font-bold mt-1">
                    {getItemPrice(item).toLocaleString()} RWF
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => onRemove(item.product.id, item.selectedSize)}
                    className="text-slate-300 hover:text-red-500 transition"
                  >
                    <X size={16} />
                  </button>
                  <div className="flex items-center bg-white rounded-lg">
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.selectedSize, -1)
                      }
                      className="p-1 hover:bg-slate-100 rounded transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.selectedSize, 1)
                      }
                      className="p-1 hover:bg-slate-100 rounded transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-slate-100 space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{total.toLocaleString()} RWF</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({
  cart,
  creatorId,
  creatorName,
  creatorHandle,
  onClose,
  onSuccess,
  getItemPrice,
  total,
  currentUser,
}: {
  cart: CartItem[];
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  onClose: () => void;
  onSuccess: () => void;
  getItemPrice: (item: CartItem) => number;
  total: number;
  currentUser: any;
}) {
  const [step, setStep] = useState<"info" | "shipping" | "payment">("info");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: currentUser?.displayName || "",
    phone: "",
    address: "",
    city: "",
    country: "Rwanda",
  });
  const [processing, setProcessing] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");

  const hasPhysicalProducts = cart.some(
    (item) => item.product.type === "physical",
  );

  let platformFee = 0;
  let buyerPaysMore = false;

  for (const item of cart) {
    const feePayer = item.product.platformFeePayer || "buyer";
    if (feePayer === "buyer") {
      platformFee +=
        getItemPrice(item) * item.quantity * platformSharePercentage;
      buyerPaysMore = true;
    }
  }

  const finalTotal = total - couponDiscount;
  const totalWithPlatformFee = finalTotal + platformFee;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setApplyingCoupon(true);
    try {
      const couponsRef = collection(db, "storeCoupons");
      const q = query(
        couponsRef,
        where("creatorId", "==", creatorId),
        where("code", "==", couponCode.toUpperCase()),
        where("active", "==", true),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error("Invalid coupon code");
        return;
      }

      const coupon = snapshot.docs[0].data();
      if (coupon.minPurchase && total < coupon.minPurchase) {
        toast.error(
          `Minimum purchase of ${coupon.minPurchase.toLocaleString()} RWF required`,
        );
        return;
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        toast.error("Coupon has reached its usage limit");
        return;
      }

      let discount = 0;
      if (coupon.discountType === "percentage") {
        discount = (total * coupon.discountValue) / 100;
      } else {
        discount = coupon.discountValue;
      }

      setCouponDiscount(discount);
      setAppliedCoupon(coupon.code);
      toast.success(
        `Coupon applied! You save ${discount.toLocaleString()} RWF`,
      );
    } catch (error) {
      toast.error("Failed to apply coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const placeOrder = async () => {
    if (hasPhysicalProducts) {
      if (
        !shippingAddress.fullName ||
        !shippingAddress.phone ||
        !shippingAddress.address ||
        !shippingAddress.city
      ) {
        toast.error("Please fill in all shipping details");
        return;
      }
    }

    if (!currentUser?.uid) {
      toast.error("Please log in to complete your purchase");
      return;
    }

    if (paymentMethod === "momo" && !shippingAddress.phone) {
      toast.error("Please enter your phone number");
      return;
    }

    setProcessing(true);
    try {
      const phone = shippingAddress.phone.replace(/\s/g, "");

      const firstItem = cart[0];
      const productData = {
        productId: firstItem?.product.id,
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
        buyerId: currentUser.uid,
        buyerEmail: currentUser.email || "",
        buyerName: currentUser.displayName || "Customer",
        phone: phone,
        selectedSize: firstItem?.selectedSize,
        productPrice: firstItem?.product.price,
        productName: firstItem?.product.name,
        creatorId: creatorHandle,
        creatorUid: firstItem?.product.creatorId,
        platformFeePayer: firstItem?.product.platformFeePayer || "buyer",
      };

      const endpoint =
        paymentMethod === "momo"
          ? "/api/support/with-momo/pay"
          : "/api/support/with-card/pay";

      const paymentResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        toast.error(paymentData.error || "Payment failed to initiate");
        setProcessing(false);
        return;
      }

      if (paymentMethod === "card" && paymentData.redirect_url) {
        window.location.href = paymentData.redirect_url;
        return;
      }

      toast.success(
        "Payment initiated! Check your phone to complete the payment.",
      );
      onSuccess();
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="flex gap-2">
            {[
              "info",
              ...(hasPhysicalProducts ? ["shipping"] : []),
              "payment",
            ].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s as any)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition capitalize ${
                  step === s
                    ? "bg-orange-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {step === "info" && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <h4 className="font-bold">Order Summary</h4>
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize}`}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {item.quantity}x {item.product.name}
                    </span>
                    <span>{getItemPrice(item).toLocaleString()} RWF</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                  <span>Subtotal</span>
                  <span>{total.toLocaleString()} RWF</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Coupon Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter code"
                    className="flex-1 bg-slate-50 p-3 rounded-lg text-sm font-medium outline-none"
                    disabled={!!appliedCoupon}
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={applyingCoupon || !!appliedCoupon}
                    className="bg-slate-900 text-white px-4 rounded-lg font-bold text-sm disabled:opacity-50"
                  >
                    {applyingCoupon ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Check size={16} />
                    Coupon "{appliedCoupon}" applied! You save{" "}
                    {couponDiscount.toLocaleString()} RWF
                  </div>
                )}
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-lg font-bold text-green-600">
                  <span>Total</span>
                  <span>{finalTotal.toLocaleString()} RWF</span>
                </div>
              )}
            </div>
          )}

          {step === "shipping" && (
            <div className="space-y-4">
              <h4 className="font-bold">Shipping Address</h4>
              <input
                type="text"
                value={shippingAddress.fullName}
                onChange={(e) =>
                  setShippingAddress((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
                placeholder="Full Name"
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none"
              />
              <input
                type="tel"
                value={shippingAddress.phone}
                onChange={(e) =>
                  setShippingAddress((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="Phone Number"
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none"
              />
              <input
                type="text"
                value={shippingAddress.address}
                onChange={(e) =>
                  setShippingAddress((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                placeholder="Street Address"
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  placeholder="City"
                  className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  value={shippingAddress.country}
                  onChange={(e) =>
                    setShippingAddress((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                  placeholder="Country"
                  className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none"
                />
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <h4 className="font-bold">Final Total</h4>
                <div className="flex justify-between text-2xl font-bold text-orange-600">
                  <span>Total</span>
                  <span>
                    {buyerPaysMore
                      ? totalWithPlatformFee.toLocaleString()
                      : finalTotal.toLocaleString()}{" "}
                    RWF
                  </span>
                </div>
                {buyerPaysMore && (
                  <p className="text-xs text-slate-500">
                    (Includes platform fee: {platformFee.toLocaleString()} RWF)
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("momo")}
                    className={`py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all ${
                      paymentMethod === "momo"
                        ? "border-orange-600 bg-orange-50 text-orange-600"
                        : "border-slate-200 text-slate-400"
                    }`}
                  >
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all ${
                      paymentMethod === "card"
                        ? "border-orange-600 bg-orange-50 text-orange-600"
                        : "border-slate-200 text-slate-400"
                    }`}
                  >
                    Card Payment
                  </button>
                </div>
              </div>

              {paymentMethod === "momo" && (
                <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Payment will be processed via Mobile Money. You will receive
                    a prompt on your phone to complete the payment.
                  </p>
                </div>
              )}

              {paymentMethod === "momo" && (
                <div className="space-y-3">
                  <label className="text-sm font-bold">
                    MTN Mobile Money Number
                  </label>
                  <input
                    type="tel"
                    placeholder="07X XXX XXXX"
                    value={shippingAddress.phone}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        phone: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none"
                  />
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                  <CreditCard size={20} className="text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    You will be redirected to a secure payment page to complete
                    your card payment.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100">
          <div className="flex gap-3">
            {step !== "info" && (
              <button
                onClick={() =>
                  setStep(step === "shipping" ? "info" : "shipping")
                }
                className="flex-1 py-4 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition"
              >
                Back
              </button>
            )}
            {step !== "payment" ? (
              <button
                onClick={() =>
                  setStep(step === "info" ? "shipping" : "payment")
                }
                className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={placeOrder}
                disabled={processing}
                className="flex-1 py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                {processing ? "Processing..." : "Place Order"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderTrackingModal({
  orders,
  onClose,
  currentUser,
}: {
  orders: Order[];
  onClose: () => void;
  currentUser: any;
}) {
  const statusSteps = ["pending", "paid", "processing", "shipped", "delivered"];
  const statusLabels: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-orange-100 text-orange-700",
    delivered: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const getStatusIndex = (status: string) => statusSteps.indexOf(status);

  const [downloadingProduct, setDownloadingProduct] = useState<string | null>(
    null,
  );

  const handleDownload = async (productId: string, fileUrl: string) => {
    setDownloadingProduct(productId);
    try {
      window.open(fileUrl, "_blank");
    } finally {
      setTimeout(() => setDownloadingProduct(null), 1000);
    }
  };

  const physicalOrders = orders.filter((o) =>
    o.items.some((i) => i.productId.startsWith("product_")),
  );
  const digitalOrders = orders.filter((o) =>
    o.items.every((i) => i.productId.startsWith("product_")),
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">My Orders</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Truck size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">No orders yet</p>
              <p className="text-slate-400 text-sm mt-2">
                Your orders will appear here
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-slate-50 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-slate-400">
                      {order.createdAt instanceof Timestamp
                        ? order.createdAt.toDate().toLocaleDateString()
                        : new Date(order.createdAt as any).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[order.status]}`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm items-center"
                    >
                      <span>
                        {item.quantity}x {item.productName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {item.price.toLocaleString()} RWF
                        </span>
                        {order.status !== "cancelled" && (
                          <button
                            onClick={() => handleDownload(item.productId, "")}
                            className="text-green-600 hover:bg-green-50 p-1 rounded transition"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.status !== "cancelled" && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      {statusSteps.map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              getStatusIndex(order.status) >= idx
                                ? "bg-orange-500 text-white"
                                : "bg-slate-200 text-slate-400"
                            }`}
                          >
                            {getStatusIndex(order.status) > idx ? (
                              <Check size={14} />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          {idx < statusSteps.length - 1 && (
                            <div
                              className={`w-8 h-0.5 ${
                                getStatusIndex(order.status) > idx
                                  ? "bg-orange-500"
                                  : "bg-slate-200"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      {statusSteps.map((step) => (
                        <span key={step}>{statusLabels[step]}</span>
                      ))}
                    </div>
                  </div>
                )}

                {order.trackingNumber && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm">
                    <span className="text-blue-800 font-medium">
                      Tracking:{" "}
                    </span>
                    <span className="text-blue-600">
                      {order.trackingNumber}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                  <span className="font-bold">
                    Total: {order.total.toLocaleString()} RWF
                  </span>
                  {order.status === "pending" && (
                    <Link
                      href={`/store/pay/${order.id}`}
                      target="_blank"
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 transition"
                    >
                      Pay Now
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
