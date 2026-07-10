import { Plus, Minus, ShoppingCart, CreditCard, X, Package } from "lucide-react";
import { CartItem } from "./types";
import { formatCurrency } from "@/types/currency";

export function CartModal({
  cart,
  onClose,
  onCheckout,
  onUpdateQuantity,
  onRemove,
  getItemPrice,
  total,
  currency = "RWF",
}: {
  cart: CartItem[];
  onClose: () => void;
  onCheckout: () => void;
  onUpdateQuantity: (
    id: string,
    size: string | undefined,
    delta: number,
  ) => void;
  onRemove: (id: string, size?: string) => void;
  getItemPrice: (item: CartItem) => number;
  total: number;
  currency?: string;
}) {
  return (
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-hover rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-border-strong mb-4" />
              <p className="text-muted-foreground font-medium">Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedSize}`}
                className="flex gap-4 p-4 bg-muted rounded-xl"
              >
                <div className="w-20 h-20 bg-card rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={24} className="text-border-strong" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{item.product.name}</h4>
                  {item.selectedSize && (
                    <p className="text-xs text-muted-foreground">
                      Size: {item.selectedSize}
                    </p>
                  )}
                  <p className="text-sm text-orange-600 font-bold mt-1">
                    {formatCurrency(getItemPrice(item), currency)}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => onRemove(item.product.id, item.selectedSize)}
                    className="text-muted-foreground hover:text-red-500 transition"
                  >
                    <X size={16} />
                  </button>
                  <div className="flex items-center bg-card rounded-lg">
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.selectedSize, -1)
                      }
                      className="p-1 hover:bg-muted rounded transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.selectedSize, 1)
                      }
                      className="p-1 hover:bg-muted rounded transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-border space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
