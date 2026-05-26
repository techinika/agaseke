import { useState } from "react";
import { Truck, X, Check, Download, Loader } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import { Order, Product } from "./types";
import { downloadProduct } from "@/lib/downloadProduct";

const statusSteps = ["pending", "paid", "processing", "shipped", "delivered"];
const statusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-orange-100 text-orange-700",
  delivered: "bg-muted text-foreground",
  cancelled: "bg-red-100 text-red-700",
};

export function OrderTrackingModal({
  orders,
  products = [],
  uid,
  onClose,
}: {
  orders: Order[];
  products?: Product[];
  uid?: string;
  onClose: () => void;
}) {
  const [downloadingProduct, setDownloadingProduct] = useState<string | null>(
    null,
  );

  const getStatusIndex = (status: string) => statusSteps.indexOf(status);

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
          <h2 className="text-xl font-bold">My Orders</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Truck size={48} className="mx-auto text-border-strong mb-4" />
              <p className="text-muted-foreground font-medium">No orders yet</p>
              <p className="text-muted-foreground text-sm mt-2">
                Your orders will appear here
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const safeTotal =
                typeof order.total === "number"
                  ? order.total
                  : typeof (order as any).total === "number"
                    ? (order as any).total
                    : 0;

              return (
                <div key={order.id} className="bg-muted rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.createdAt instanceof Timestamp
                          ? order.createdAt.toDate().toLocaleDateString()
                          : new Date(
                              (order.createdAt as any)?.toDate?.() ||
                                order.createdAt,
                            ).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[order.status] || "bg-muted text-foreground"}`}
                    >
                      {(order.status || "unknown").toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {(order.items
                      ? order.items
                      : [
                          {
                            productId: (order as any).productId,
                            productName: (order as any).productName,
                            quantity: (order as any).quantity,
                            price: (order as any).productPrice,
                          },
                        ]
                    ).map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm items-center"
                      >
                        <span>
                          {item.quantity}x {item.productName || "Product"}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {typeof item.price === "number"
                              ? item.price.toLocaleString()
                              : "0"}{" "}
                            RWF
                          </span>
                          {order.status !== "cancelled" && item.productId && (
                            <button
                              onClick={() =>
                                handleDownload(item.productId)
                              }
                              className="text-green-600 hover:bg-green-50 p-1 rounded transition"
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.status !== "cancelled" && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        {statusSteps.map((step, idx) => (
                          <div key={step} className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                getStatusIndex(order.status) >= idx
                                  ? "bg-orange-500 text-white"
                                  : "bg-border-strong text-muted-foreground"
                              }`}
                            >
                              {getStatusIndex(order.status) > idx ? (
                                <Check size={14} />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            {idx < statusSteps.length - 1 && (
                              <div
                                className={`w-8 h-0.5 ${
                                  getStatusIndex(order.status) > idx
                                    ? "bg-orange-500"
                                    : "bg-border-strong"
                                }`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        {statusSteps.map((step) => (
                          <span key={step}>{statusLabels[step]}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.trackingNumber && (
                    <div className="bg-blue-50 rounded-lg p-3 text-sm">
                      <span className="text-blue-800 font-medium">
                        Tracking:{" "}
                      </span>
                      <span className="text-blue-600">
                        {order.trackingNumber}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-border-strong">
                    <span className="font-bold">
                      Total: {safeTotal.toLocaleString()} RWF
                    </span>
                    {order.status === "pending" && (
                      <Link
                        href={`/store/pay/${order.id}`}
                        target="_blank"
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 transition"
                      >
                        Pay Now
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
