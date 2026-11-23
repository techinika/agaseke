import React from "react";
import { FileText, Edit, Trash2 } from "lucide-react";
import { Product } from "@/types/store";
import { formatCurrency } from "@/types/currency";
import { Button, Card, EmptyState, MediaImage } from "@/components/ui";

export interface StoreFolder {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  active?: boolean;
  productIds?: string[];
  discountEnabled?: boolean;
  discountPercentage?: number;
  bundlePrice?: number;
  currency?: string;
}

export default function FoldersList({
  folders,
  products,
  onEdit,
  onDelete,
}: {
  folders: StoreFolder[];
  products: Product[];
  onEdit: (folder: StoreFolder) => void;
  onDelete: (id: string) => void;
}) {
  if (folders.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-6" aria-hidden="true" />}
        title="No bundles yet"
        description="Group products together into folders for discounted bundle sales."
      />
    );
  }

  const getProductNames = (productIds: string[]) => {
    return productIds
      .map((id) => products.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((folder) => (
        <Card key={folder.id} className="flex flex-col overflow-hidden">
          <div className="relative aspect-video bg-surface-sunken">
            {folder.imageUrl ? (
              <MediaImage
                src={folder.imageUrl}
                alt={folder.name}
                aspectRatio="16 / 9"
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-fg">
                <FileText className="size-10 opacity-40" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex flex-wrap items-center gap-1.5 text-caption text-muted-fg">
              <span className={folder.active ? "font-semibold text-success" : ""}>
                {folder.active ? "Active" : "Inactive"}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {folder.productIds?.length || 0} products
              </span>
              {folder.discountEnabled && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-success">
                    {folder.discountPercentage}% off
                  </span>
                </>
              )}
              {(folder.bundlePrice ?? 0) > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold tabular-nums text-fg">
                    {formatCurrency(folder.bundlePrice ?? 0, folder.currency || "RWF")}
                  </span>
                </>
              )}
            </div>
            <h3 className="mt-1.5 text-body-lg font-bold text-fg">{folder.name}</h3>
            {folder.description && (
              <p className="mt-1 text-label text-muted-fg">{folder.description}</p>
            )}
            <p className="mt-2 line-clamp-2 text-caption text-muted-fg">
              {getProductNames(folder.productIds || [])}
            </p>
            <div className="mt-auto flex gap-2 pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(folder)}
                leadingIcon={<Edit className="size-3.5" aria-hidden="true" />}
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete folder ${folder.name}`}
                onClick={() => onDelete(folder.id)}
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
