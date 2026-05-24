import React from "react";
import { FileText, Edit, Trash2 } from "lucide-react";
import { Product } from "@/types/store";

export default function FoldersList({
  folders,
  products,
  onEdit,
  onDelete,
}: {
  folders: any[];
  products: Product[];
  onEdit: (folder: any) => void;
  onDelete: (id: string) => void;
}) {
  if (folders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
        <FileText size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No folders yet</p>
        <p className="text-slate-400 text-sm mt-2">
          Group products together for bundle sales
        </p>
      </div>
    );
  }

  const getProductNames = (productIds: string[]) => {
    return productIds
      .map((id) => products.find((p) => p.id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="bg-white rounded-lg border border-slate-100 overflow-hidden"
        >
          <div className="aspect-video bg-gradient-to-br from-orange-50 to-amber-50 relative">
            {folder.imageUrl ? (
              <img
                src={folder.imageUrl}
                alt={folder.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText size={40} className="text-slate-300" />
              </div>
            )}
            <span
              className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full ${
                folder.active
                  ? "bg-green-100 text-green-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {folder.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-lg">{folder.name}</h3>
            {folder.description && (
              <p className="text-sm text-slate-500 mt-1">{folder.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <p className="text-lg font-bold text-slate-900">
                {folder.productIds?.length || 0} products
              </p>
              {folder.discountEnabled && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {folder.discountPercentage}% OFF
                </span>
              )}
              {folder.bundlePrice > 0 && (
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  {folder.bundlePrice.toLocaleString()} RWF
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
              {getProductNames(folder.productIds || [])}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onEdit(folder)}
                className="flex-1 py-2 text-xs font-bold border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition"
              >
                <Edit size={14} className="inline mr-1" /> Edit
              </button>
              <button
                onClick={() => onDelete(folder.id)}
                className="flex-1 py-2 text-xs font-bold border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={14} className="inline mr-1" /> Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
