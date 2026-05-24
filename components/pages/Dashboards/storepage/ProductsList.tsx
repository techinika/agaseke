import React from "react";
import { Package, Edit, Trash2 } from "lucide-react";
import { Product } from "@/types/store";

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
      <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
        <Package size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">No products yet</p>
        <p className="text-slate-400 text-sm mt-2">
          Add your first product to start selling
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm"
        >
          <div className="aspect-square bg-slate-50 relative">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={48} className="text-slate-200" />
              </div>
            )}
            <span
              className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full ${
                product.type === "digital"
                  ? "bg-orange-100 text-orange-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {product.type === "digital" ? "Digital" : "Physical"}
            </span>
            {!product.active && (
              <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                Inactive
              </span>
            )}
          </div>
          <div className="p-4">
            <h4 className="font-bold text-lg truncate">{product.name}</h4>
            <p className="text-sm text-slate-500 truncate mt-1">
              {product.description}
            </p>
            <div className="flex items-center justify-between mt-4">
              <span className="font-bold text-lg">
                {product.price.toLocaleString()} RWF
              </span>
              {product.type === "physical" && (
                <span className="text-xs text-slate-400">
                  {product.stock} in stock
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onEdit(product)}
                className="flex-1 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                <Edit size={14} className="inline mr-1" /> Edit
              </button>
              <button
                onClick={() => onDelete(product.id)}
                className="px-3 py-2 text-xs font-bold border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
