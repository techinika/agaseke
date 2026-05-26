import { useState } from "react";
import {
  Plus,
  Minus,
  ShoppingCart,
  Check,
  Truck,
  Download,
  X,
  Package,
  Loader,
} from "lucide-react";
import { toast } from "sonner";
import { Product } from "./types";
import { downloadProduct } from "@/lib/downloadProduct";

const platformSharePercentage =
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  isLoggedIn,
  isPurchased,
  fileUrl,
  uid,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number, size?: string) => void;
  isLoggedIn: boolean;
  isPurchased: boolean;
  fileUrl?: string;
  uid?: string;
}) {
  const [downloading, setDownloading] = useState(false);
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
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-card w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="md:flex">
          <div className="md:w-1/2 bg-muted aspect-square">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={64} className="text-border-strong" />
              </div>
            )}
          </div>

          <div className="md:w-1/2 p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap-reverse justify-between">
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
              <button
                onClick={onClose}
                className="p-2 hover:bg-card-hover rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-muted-foreground">{product.description}</p>

            <div>
              <div className="text-3xl font-bold">
                {product.price.toLocaleString()} RWF
              </div>
              {product.platformFeePayer === "buyer" && (
                <p className="text-xs text-muted-foreground mt-1">
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
                          : "bg-muted hover:bg-border-strong"
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
                  <button
                    onClick={() => {
                      setDownloading(true);
                      downloadProduct(product.id, uid)
                        .catch(() => toast.error("Download failed"))
                        .finally(() => setDownloading(false));
                    }}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2"
                  >
                    {downloading ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
                    {downloading ? "Downloading..." : "Download"}
                  </button>
                )}
                {product.type === "physical" && (
                  <span className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-lg font-bold flex items-center justify-center gap-2">
                    <Truck size={18} /> Track in My Orders
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-muted rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-border-strong rounded-l-lg transition"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-border-strong rounded-r-lg transition"
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
