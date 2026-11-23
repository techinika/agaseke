import React from "react";
import { Package, Edit, Trash2 } from "lucide-react";
import { Product, getProductCurrency, getProductPrice } from "@/types/store";
import { formatCurrency } from "@/types/currency";
import { Button, Card, EmptyState, MediaImage } from "@/components/ui";

export default function ProductsList({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-6" aria-hidden="true" />}
        title="No products yet"
        description="Add your first digital or physical product to start selling from your store."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <Card key={product.id} className="flex flex-col overflow-hidden">
          <div className="relative aspect-square bg-surface-sunken">
            {product.imageUrl ? (
              <MediaImage
                src={product.imageUrl}
                alt={product.name}
                aspectRatio="1 / 1"
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-fg">
                <Package className="size-10 opacity-40" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-center gap-1.5 text-caption text-muted-fg">
              <span>{product.type === "digital" ? "Digital" : "Physical"}</span>
              {!product.active && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-warning">Inactive</span>
                </>
              )}
              {product.type === "physical" && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{product.stock ?? 0} in stock</span>
                </>
              )}
            </div>
            <h3 className="mt-1 truncate text-body font-bold text-fg">{product.name}</h3>
            {product.description && (
              <p className="mt-1 line-clamp-2 text-caption text-muted-fg">
                {product.description}
              </p>
            )}
            <p className="mt-auto pt-3 text-body-lg font-bold tabular-nums text-fg">
              {formatCurrency(getProductPrice(product), getProductCurrency(product))}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(product)}
                leadingIcon={<Edit className="size-3.5" aria-hidden="true" />}
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${product.name}`}
                onClick={() => onDelete(product.id)}
                className="border border-line text-danger hover:bg-danger-bg"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
