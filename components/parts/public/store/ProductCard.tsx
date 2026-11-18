import { useState } from "react";
import {
  Plus,
  Minus,
  ShoppingCart,
  Check,
  Truck,
  Download,
  Lock,
  Package,
  Loader,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Product, getProductCurrency, getProductPrice } from "./types";
import { downloadProduct } from "@/lib/downloadProduct";
import { formatMoney as formatCurrency } from "@/lib/format/money";

const platformSharePercentage =
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;

export function ProductCard({
  product,
  onAddToCart,
  onSelectProduct,
  creatorHandle,
  isLoggedIn,
  isPurchased,
  fileUrl,
  uid,
}: {
  product: Product;
  onAddToCart: (product: Product, quantity?: number, size?: string) => void;
  onSelectProduct: (product: Product) => void;
  creatorHandle?: string;
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
  const isOutOfStock = product.type === "physical" && product.stock <= 0;

  const basePrice = getProductPrice(product);
  const priceWithFee =
    basePrice +
    ((product.platformFeePayer || "buyer") === "buyer"
      ? basePrice * platformSharePercentage
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
      className={`bg-surface border rounded-card overflow-hidden shadow-sm hover:shadow-xl transition-all ${isPurchased ? "border-success" : "border-line"}`}
    >
      {creatorHandle ? (
        <Link href={`/${creatorHandle}/store/${product.id}`} className="block aspect-square bg-surface-sunken relative">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={48} className="text-muted-fg" />
            </div>
          )}
          <span className={`absolute top-3 left-3 text-caption font-bold px-2 py-1 rounded-full ${product.type === "digital" ? "bg-brand-soft text-brand-strong" : "bg-info-bg text-info"}`}>
            {product.type === "digital" ? "Digital" : "Physical"}
          </span>
          {isPurchased && (
            <span className="absolute top-3 right-3 bg-success-bg text-success text-caption font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Check size={10} /> Owned
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-surface/80 flex items-center justify-center">
              <span className="bg-danger-bg text-danger px-3 py-1 rounded-full text-xs font-bold">Out of Stock</span>
            </div>
          )}
        </Link>
      ) : (
        <div className="aspect-square bg-surface-sunken relative cursor-pointer" onClick={() => onSelectProduct(product)}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={48} className="text-muted-fg" />
            </div>
          )}
          <span className={`absolute top-3 left-3 text-caption font-bold px-2 py-1 rounded-full ${product.type === "digital" ? "bg-brand-soft text-brand-strong" : "bg-info-bg text-info"}`}>
            {product.type === "digital" ? "Digital" : "Physical"}
          </span>
          {isPurchased && (
            <span className="absolute top-3 right-3 bg-success-bg text-success text-caption font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Check size={10} /> Owned
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-surface/80 flex items-center justify-center">
              <span className="bg-danger-bg text-danger px-3 py-1 rounded-full text-xs font-bold">Out of Stock</span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{product.name}</h3>
        <p className="text-sm text-muted-fg line-clamp-2 mt-1">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-xl font-bold">
              {formatCurrency(basePrice, getProductCurrency(product))}
            </span>
            {product.platformFeePayer === "buyer" && (
              <p className="text-caption text-muted-fg">
                +{platformSharePercentage * 100}% fee ={" "}
                {formatCurrency(priceWithFee, getProductCurrency(product))}
              </p>
            )}
          </div>
          {product.discount?.enabled && (
            <span className="bg-brand-soft text-brand-strong text-caption font-bold px-2 py-1 rounded-full">
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
                className={`px-3 py-1 text-xs font-bold rounded-control transition ${
                  selectedSize === size
                    ? "bg-brand-strong text-on-brand"
                    : "bg-surface-sunken text-muted-fg hover:bg-surface-sunken"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {product.type === "physical" && (
          <p className="text-xs text-muted-fg mt-2">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>
        )}

        {isPurchased ? (
          <div className="flex gap-2 mt-4">
            {product.type === "digital" && fileUrl && (
              <button
                onClick={() => {
                  setDownloading(true);
                  downloadProduct(product.id, uid)
                    .catch((e) => toast.error(e.message))
                    .finally(() => setDownloading(false));
                }}
                className="flex-1 py-2 bg-success text-on-success rounded-control font-bold text-sm hover:bg-success transition flex items-center justify-center gap-2"
              >
                {downloading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                {downloading ? "Downloading..." : "Download"}
              </button>
            )}
            {product.type === "physical" && (
              <span className="flex-1 py-2 bg-info-bg text-info rounded-control font-bold text-sm flex items-center justify-center gap-2">
                <Truck size={14} /> Track Order
              </span>
            )}
            {product.type === "digital" && !fileUrl && (
              <span className="flex-1 py-2 bg-success-bg text-success rounded-control font-bold text-sm flex items-center justify-center gap-2">
                <Check size={14} /> Purchased
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center bg-surface-sunken rounded-control">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-surface-sunken rounded-l-lg transition"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 hover:bg-surface-sunken rounded-r-lg transition"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={isOutOfStock || !isLoggedIn}
              className="flex-1 py-2 bg-brand-strong text-on-brand rounded-control font-bold text-sm hover:bg-brand-strong transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
