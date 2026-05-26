import { useState } from "react";
import { Package, Download, X, Loader } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Product, Order } from "./types";
import { downloadProduct } from "@/lib/downloadProduct";

export function MyPurchasesModal({
  orders,
  products,
  creatorHandle,
  uid,
  onClose,
}: {
  orders: Order[];
  products: Product[];
  creatorHandle: string;
  uid?: string;
  onClose: () => void;
}) {
  const [downloadingProduct, setDownloadingProduct] = useState<string | null>(
    null,
  );

  const purchasedItems = orders
    .filter(
      (o) =>
        o.status === "paid" ||
        o.status === "processing" ||
        o.status === "shipped" ||
        o.status === "delivered",
    )
    .map((order) => {
      if (order.items && Array.isArray(order.items)) {
        return order.items.map((item) => ({
          ...item,
          orderStatus: order.status,
          orderId: order.id,
          createdAt: order.createdAt,
        }));
      } else {
        return [
          {
            productId: (order as any).productId,
            productName: (order as any).productName,
            quantity: (order as any).quantity,
            price: (order as any).productPrice,
            selectedSize: (order as any).selectedSize,
            orderStatus: order.status,
            orderId: order.id,
            createdAt: order.createdAt,
          },
        ];
      }
    })
    .flat();

  const handleDownload = async (productId: string) => {
    setDownloadingProduct(productId);
    try {
      await downloadProduct(productId, uid);
    } catch {
      toast.error("Download failed");
    }
    setTimeout(() => setDownloadingProduct(null), 1000);
  };

  return (
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-card w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">My Purchases</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {purchasedItems.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No purchases yet</p>
            </div>
          ) : (
            purchasedItems.map((item, idx) => (
              <div
                key={idx}
                className="border border-border rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-foreground">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x {item.price.toLocaleString()} RWF
                      {item.selectedSize && ` - Size: ${item.selectedSize}`}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      item.orderStatus === "delivered"
                        ? "bg-muted text-foreground"
                        : item.orderStatus === "shipped"
                          ? "bg-orange-100 text-orange-700"
                          : item.orderStatus === "processing"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.orderStatus.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => handleDownload(item.productId)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition"
                  >
                    <Download size={14} />
                    {downloadingProduct === item.productId
                      ? "Downloading..."
                      : "Download"}
                  </button>

                  <Link
                    href={`/${creatorHandle}?tab=store`}
                    className="px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium transition"
                  >
                    Buy Again
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Ordered on{" "}
                  {item.createdAt
                    ? new Date(
                        (item.createdAt as any)?.toDate?.() || item.createdAt,
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
