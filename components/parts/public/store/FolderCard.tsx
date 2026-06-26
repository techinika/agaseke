import { FolderOpen, ChevronRight, Check } from "lucide-react";
import { Product, FolderData } from "./types";

const platformSharePercentage =
  Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;

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
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
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
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: folder.description }} />
        )}
        <div className="mt-3 space-y-1">
          {folderProducts.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground truncate flex-1">{p.name}</span>
              <span
                className={`font-medium ml-2 ${purchasedProductIds.has(p.id) ? "text-green-500" : "text-foreground"}`}
              >
                {purchasedProductIds.has(p.id)
                  ? "Owned"
                  : `${p.price.toLocaleString()} RWF`}
              </span>
            </div>
          ))}
          {folderProducts.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{folderProducts.length - 3} more items
            </p>
          )}
        </div>
        {unpurchased.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">
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
