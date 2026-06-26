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
import { Product } from "./types";
import { downloadProduct } from "@/lib/downloadProduct";

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
      className={`bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all ${isPurchased ? "border-green-200" : "border-border"}`}
    >
      {creatorHandle ? (
        <Link href={`/${creatorHandle}/store/${product.id}`} className="block aspect-square bg-muted relative">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={48} className="text-muted-foreground" />
            </div>
          )}
          <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full ${product.type === "digital" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
            {product.type === "digital" ? "Digital" : "Physical"}
          </span>
          {isPurchased && (
            <span className="absolute top-3 right-3 bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Check size={10} /> Owned
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
              <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">Out of Stock</span>
            </div>
          )}
        </Link>
      ) : (
        <div className="aspect-square bg-muted relative cursor-pointer" onClick={() => onSelectProduct(product)}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={48} className="text-muted-foreground" />
            </div>
          )}
          <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full ${product.type === "digital" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
            {product.type === "digital" ? "Digital" : "Physical"}
          </span>
          {isPurchased && (
            <span className="absolute top-3 right-3 bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Check size={10} /> Owned
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
              <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">Out of Stock</span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: product.description }} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-xl font-bold">
              {product.price.toLocaleString()} RWF
            </span>
            {product.platformFeePayer === "buyer" && (
              <p className="text-[10px] text-muted-foreground">
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
                    : "bg-muted text-muted-foreground hover:bg-muted"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {product.type === "physical" && (
          <p className="text-xs text-muted-foreground mt-2">
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
                className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition flex items-center justify-center gap-2"
              >
                {downloading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                {downloading ? "Downloading..." : "Download"}
              </button>
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
            <div className="flex items-center bg-muted rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-muted rounded-l-lg transition"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 hover:bg-muted rounded-r-lg transition"
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
