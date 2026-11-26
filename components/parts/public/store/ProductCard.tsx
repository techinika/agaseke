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
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.1;

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
  const [imgError, setImgError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes?.[0],
  );
  const isOutOfStock = product.type === "physical" && product.stock <= 0;
  const currencyCode = getProductCurrency(product);
  const productHref = creatorHandle ? `/${creatorHandle}/store/${product.id}` : null;

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

  const mediaContent = (
    <>
      {product.imageUrl && !imgError ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Package size={48} className="text-muted-fg" />
        </div>
      )}
      {isPurchased && (
        <span className="absolute top-3 right-3 flex items-center gap-1 rounded-control bg-success-bg px-2 py-1 text-caption font-bold text-success">
          <Check size={12} /> Owned
        </span>
      )}
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
          <span className="rounded-control bg-danger-bg px-3 py-1 text-caption font-bold text-danger">
            Out of Stock
          </span>
        </div>
      )}
    </>
  );

  return (
    <div
      className={`group overflow-hidden rounded-card border bg-surface shadow-sm transition-all hover:shadow-lg ${isPurchased ? "border-success" : "border-line"}`}
    >
      {productHref ? (
        <Link href={productHref} className="relative block aspect-square bg-surface-sunken">
          {mediaContent}
        </Link>
      ) : (
        <div className="relative aspect-square cursor-pointer bg-surface-sunken" onClick={() => onSelectProduct(product)}>
          {mediaContent}
        </div>
      )}

      <div className="p-4">
        <div className="mb-1 flex items-center justify-between gap-2 text-caption font-semibold text-muted-fg">
          <span className={product.type === "digital" ? "text-brand-strong" : "text-info"}>
            {product.type === "digital" ? "Digital" : "Physical"}
          </span>
          {product.discount?.enabled && (
            <span className="font-bold text-brand-strong">
              {product.discount.percentage}% OFF
            </span>
          )}
        </div>
        {productHref ? (
          <Link href={productHref} className="block">
            <h3 className="truncate text-title font-bold text-fg transition-colors group-hover:text-brand-strong">
              {product.name}
            </h3>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onSelectProduct(product)}
            className="block w-full text-left"
          >
            <h3 className="truncate text-title font-bold text-fg transition-colors group-hover:text-brand-strong">
              {product.name}
            </h3>
          </button>
        )}
        <p className="mt-1 line-clamp-2 text-label text-muted-fg">
          {product.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div>
            <span className="text-xl font-bold tabular-nums text-fg">
              {formatCurrency(basePrice, currencyCode)}
            </span>
            {product.platformFeePayer === "buyer" && (
              <p className="text-caption text-muted-fg tabular-nums">
                +{platformSharePercentage * 100}% fee ={" "}
                {formatCurrency(priceWithFee, currencyCode)}
              </p>
            )}
          </div>
          <span className="text-caption font-semibold text-muted-fg">
            {currencyCode}
          </span>
        </div>

        {product.sizes && product.sizes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`min-h-9 rounded-control px-3 py-1 text-caption font-bold transition ${
                  selectedSize === size
                    ? "bg-brand-strong text-on-brand"
                    : "bg-surface-sunken text-muted-fg hover:text-fg"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {product.type === "physical" && (
          <p className="mt-2 text-caption text-muted-fg">
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
