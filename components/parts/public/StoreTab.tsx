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
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [processing, setProcessing] = useState(false);

  const canAccess = storePublic || isSupporter;

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
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
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
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

  if (showCart && !showCheckout) {
    return (
      <CartModal
        cart={cart}
        onClose={() => setShowCart(false)}
        onCheckout={() => setShowCheckout(true)}
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

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
          <Package size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">No products available</p>
          <p className="text-slate-400 text-sm mt-2">
            Check back later for new products
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
              onSelectProduct={setSelectedProduct}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
};

function ProductCard({
  product,
  onAddToCart,
  onSelectProduct,
  isLoggedIn,
}: {
  product: Product;
  onAddToCart: (product: Product, quantity?: number, size?: string) => void;
  onSelectProduct: (product: Product) => void;
  isLoggedIn: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes?.[0],
  );
  const isOutOfStock = product.type === "physical" && product.stock <= 0;

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
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
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
              ? "bg-purple-100 text-purple-600"
              : "bg-blue-100 text-blue-600"
          }`}
        >
          {product.type === "digital" ? "Digital" : "Physical"}
        </span>
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
          <span className="text-xl font-bold">
            {product.price.toLocaleString()} RWF
          </span>
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
      </div>
    </div>
  );
}

function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  isLoggedIn,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number, size?: string) => void;
  isLoggedIn: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes?.[0],
  );

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
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                product.type === "digital"
                  ? "bg-purple-100 text-purple-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {product.type === "digital"
                ? "Digital Product"
                : "Physical Product"}
            </span>

            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-slate-600">{product.description}</p>

            <div className="text-3xl font-bold">
              {product.price.toLocaleString()} RWF
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
  onClose,
  onSuccess,
  getItemPrice,
  total,
  currentUser,
}: {
  cart: CartItem[];
  creatorId: string;
  creatorName: string;
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

  const hasPhysicalProducts = cart.some(
    (item) => item.product.type === "physical",
  );
  const finalTotal = total - couponDiscount;

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

    setProcessing(true);
    try {
      const orderData: any = {
        creatorId,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || "Customer",
        buyerEmail: currentUser.email || "",
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          selectedSize: item.selectedSize,
        })),
        subtotal: total,
        discount: couponDiscount,
        total: finalTotal,
        couponCode: appliedCoupon,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (hasPhysicalProducts) {
        orderData.shippingAddress = shippingAddress;
      }

      const orderRef = await addDoc(collection(db, "storeOrders"), orderData);

      if (appliedCoupon) {
        const couponsRef = collection(db, "storeCoupons");
        const q = query(
          couponsRef,
          where("creatorId", "==", creatorId),
          where("code", "==", appliedCoupon),
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await updateDoc(doc(db, "storeCoupons", snapshot.docs[0].id), {
            usedCount: (snapshot.docs[0].data().usedCount || 0) + 1,
          });
        }
      }

      for (const item of cart) {
        if (item.product.type === "physical") {
          const productRef = doc(db, "storeProducts", item.product.id);
          await updateDoc(productRef, {
            stock: Math.max(0, (item.product.stock || 0) - item.quantity),
          });
        }
      }

      fetch("/api/comms/email/store/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorEmail: "",
          creatorName,
          buyerName: currentUser.displayName,
          buyerEmail: currentUser.email,
          orderId: orderRef.id,
          items: cart,
          total: finalTotal,
        }),
      }).catch(() => {});

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
                  <span>{finalTotal.toLocaleString()} RWF</span>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Payment will be processed via Mobile Money. You will receive a
                  prompt on your phone to complete the payment.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold">
                  MTN Mobile Money Number
                </label>
                <input
                  type="tel"
                  placeholder="07X XXX XXXX"
                  className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none"
                />
              </div>
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
    shipped: "bg-purple-100 text-purple-700",
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
    o.items.some((i) => !i.productId.startsWith("digital")),
  );
  const digitalOrders = orders.filter((o) =>
    o.items.every((i) => i.productId.startsWith("digital")),
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
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="font-medium">
                        {item.price.toLocaleString()} RWF
                      </span>
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
