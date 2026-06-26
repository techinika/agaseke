import { ChevronRight, Package, ShoppingCart } from "lucide-react";
import { Product, FolderData } from "./types";
import { ProductCard } from "./ProductCard";

export function FolderExplorer({
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
          className="p-2 hover:bg-card-hover rounded-lg transition"
        >
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-xl font-bold">{folder.name}</h2>
          {folder.description && (
            <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: folder.description }} />
          )}
        </div>
      </div>

      {unpurchased.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">
                Bundle Total: {folderTotal.toLocaleString()} RWF
              </p>
              {folderPlatformFee > 0 && (
                <p className="text-xs text-muted-foreground">
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
        <div className="text-center py-20 bg-card border border-border rounded-3xl">
          <Package size={48} className="mx-auto text-border-strong mb-4" />
          <p className="text-muted-foreground font-medium">
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
