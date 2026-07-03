import { useState } from "react";
import {
  Loader,
  Check,
  CreditCard,
  X,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/db/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { CartItem, ShippingAddress } from "./types";

const platformSharePercentage =
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;

export function CheckoutModal({
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
      const amountToPay = buyerPaysMore ? totalWithPlatformFee : finalTotal;
      const productData = {
        productId: firstItem?.product.id,
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
        supporterId: currentUser.uid,
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
        amount: amountToPay,
        email: currentUser.email || "",
        firstName: currentUser.displayName?.split(" ")[0] || "Customer",
        lastName: currentUser.displayName?.split(" ")[1] || "",
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
        window.open(paymentData.redirect_url, "_blank");
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
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition"
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
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {step === "info" && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-4 space-y-2">
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
                <div className="border-t border-border pt-2 flex justify-between font-bold">
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
                    className="flex-1 bg-muted p-3 rounded-lg text-sm font-medium outline-none"
                    disabled={!!appliedCoupon}
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={applyingCoupon || !!appliedCoupon}
                    className="bg-foreground text-background px-4 rounded-lg font-bold text-sm disabled:opacity-50"
                  >
                    {applyingCoupon ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              </div>

              {appliedCoupon && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Check size={16} />
                  Coupon &quot;{appliedCoupon}&quot; applied! You save{" "}
                  {couponDiscount.toLocaleString()} RWF
                </div>
              )}

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
                className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none"
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
                className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none"
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
                className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none"
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
                  className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none"
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
                  className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none"
                />
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-4 space-y-2">
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
                  <p className="text-xs text-muted-foreground">
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
                        : "border-border text-muted-foreground"
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
                        : "border-border text-muted-foreground"
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
                    className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none"
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

        <div className="p-6 border-t border-border">
          <div className="flex gap-3">
            {step !== "info" && (
              <button
                onClick={() =>
                  setStep(step === "shipping" ? "info" : "shipping")
                }
                className="flex-1 py-4 border border-border rounded-xl font-bold hover:bg-muted transition"
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
