import { FolderOpen, ChevronRight, Check } from "lucide-react";
import { Product, FolderData, getProductCurrency, getProductPrice } from "./types";
import { formatMoney as formatCurrency } from "@/lib/format/money";

const platformSharePercentage =
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.1;

export function FolderCard({
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
    let price = getProductPrice(p);
    if ((p.platformFeePayer || "buyer") === "buyer") {
      price += price * platformSharePercentage;
    }
    return sum + price;
  }, 0);
  const bundleCurrency = unpurchased.length > 0 ? getProductCurrency(unpurchased[0]) : "RWF";
  const discountedPrice = folder.discountEnabled
    ? totalPrice - (totalPrice * folder.discountPercentage) / 100
    : totalPrice;

  return (
    <div
      onClick={onEnter}
      className="bg-surface border border-line rounded-card overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
    >
      <div className="aspect-square bg-gradient-to-br from-brand-soft to-warning-bg relative flex items-center justify-center">
        {folder.imageUrl ? (
          <img
            src={folder.imageUrl}
            alt={folder.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <FolderOpen size={64} className="text-brand-strong mx-auto mb-2" />
            <p className="text-brand-strong font-bold text-sm">
              {folderProducts.length} items
            </p>
          </div>
        )}
        <div className="absolute top-3 left-3 bg-brand-soft text-brand-strong text-caption font-bold px-2 py-1 rounded-full">
          Bundle
        </div>
        {folder.discountEnabled && (
          <div className="absolute top-3 right-3 bg-success-bg text-success text-caption font-bold px-2 py-1 rounded-full">
            {folder.discountPercentage}% OFF
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{folder.name}</h3>
        {folder.description && (
          <p className="text-sm text-muted-fg line-clamp-2 mt-1">
            {folder.description}
          </p>
        )}
        <div className="mt-3 space-y-1">
          {folderProducts.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-fg truncate flex-1">{p.name}</span>
              <span
                className={`font-medium ml-2 ${purchasedProductIds.has(p.id) ? "text-success" : "text-fg"}`}
              >
                {purchasedProductIds.has(p.id)
                  ? "Owned"
                  : formatCurrency(getProductPrice(p), getProductCurrency(p))}
              </span>
            </div>
          ))}
          {folderProducts.length > 3 && (
            <p className="text-xs text-muted-fg">
              +{folderProducts.length - 3} more items
            </p>
          )}
        </div>
        {unpurchased.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-fg">
                {formatCurrency(discountedPrice, bundleCurrency)}
              </p>
              {folder.discountEnabled && (
                <p className="text-xs text-success font-bold">
                  {folder.discountPercentage}% bundle discount
                </p>
              )}
            </div>
            <span className="flex items-center gap-1 text-brand-strong text-sm font-bold group-hover:gap-2 transition-all">
              Open <ChevronRight size={16} />
            </span>
          </div>
        )}
        {unpurchased.length === 0 && (
          <div className="mt-4">
            <span className="text-success font-bold text-sm flex items-center gap-1">
              <Check size={16} /> All items owned
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
