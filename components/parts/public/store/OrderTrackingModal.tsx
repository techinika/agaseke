import { useState, useEffect, useRef } from "react";
import { Truck, X, Check, Download, Loader } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import { Order, Product, getProductCurrency, getProductPrice } from "./types";
import { downloadProduct } from "@/lib/downloadProduct";
import { formatMoney as formatCurrency } from "@/lib/format/money";

const statusSteps = ["pending", "paid", "processing", "shipped", "delivered"];
const statusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};
const statusColors: Record<string, string> = {
  pending: "bg-warning-bg text-warning",
  paid: "bg-success-bg text-success",
  processing: "bg-info-bg text-info",
  shipped: "bg-brand-soft text-brand-strong",
  delivered: "bg-surface-sunken text-fg",
  cancelled: "bg-danger-bg text-danger",
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

  const currencyByProduct = new Map(
    products.map((product) => [product.id, getProductCurrency(product)]),
  );
  const fallbackCurrency = products[0] ? getProductCurrency(products[0]) : "RWF";
  const itemCurrency = (productId?: string) =>
    (productId && currencyByProduct.get(productId)) || fallbackCurrency;

  const getStatusIndex = (status: string) => statusSteps.indexOf(status);

  const downloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (downloadTimeoutRef.current) clearTimeout(downloadTimeoutRef.current);
    };
  }, []);

  const handleDownload = async (productId: string) => {
    setDownloadingProduct(productId);
    try {
      await downloadProduct(productId, uid);
    } catch (e) {
      toast.error((e as Error).message);
    }
    if (downloadTimeoutRef.current) clearTimeout(downloadTimeoutRef.current);
    downloadTimeoutRef.current = setTimeout(() => setDownloadingProduct(null), 1000);
  };

  return (
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-surface w-full max-w-2xl rounded-card overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-line flex justify-between items-center">
          <h2 className="text-xl font-bold">My Orders</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-sunken rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Truck size={48} className="mx-auto text-border-strong mb-4" />
              <p className="text-muted-fg font-medium">No orders yet</p>
              <p className="text-muted-fg text-sm mt-2">
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

              const orderItems = order.items
                ? order.items
                : [
                    {
                      productId: (order as any).productId,
                      productName: (order as any).productName,
                      quantity: (order as any).quantity,
                      price: (order as any).productPrice,
                    },
                  ];
              const orderCurrencies = Array.from(
                new Set(orderItems.map((item: any) => itemCurrency(item.productId))),
              );
              const orderCurrency =
                orderCurrencies.length === 1 ? orderCurrencies[0] : null;

              return (
                <div key={order.id} className="bg-surface-sunken rounded-control p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-muted-fg">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-fg">
                        {order.createdAt instanceof Timestamp
                          ? order.createdAt.toDate().toLocaleDateString()
                          : new Date(
                              (order.createdAt as any)?.toDate?.() ||
                                order.createdAt,
                            ).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[order.status] || "bg-surface-sunken text-fg"}`}
                    >
                      {(order.status || "unknown").toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {orderItems.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm items-center"
                      >
                        <span>
                          {item.quantity}x {item.productName || "Product"}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {formatCurrency(
                              typeof item.price === "number" ? item.price : 0,
                              itemCurrency(item.productId),
                            )}
                          </span>
                          {order.status !== "cancelled" && item.productId && (
                            <button
                              onClick={() =>
                                handleDownload(item.productId)
                              }
                              className="text-success hover:bg-success-bg p-1 rounded transition"
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
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold ${
                                getStatusIndex(order.status) >= idx
                                  ? "bg-brand-strong text-on-brand"
                                  : "bg-border-strong text-muted-fg"
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
                                    ? "bg-brand-strong"
                                    : "bg-border-strong"
                                }`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-caption text-muted-fg">
                        {statusSteps.map((step) => (
                          <span key={step}>{statusLabels[step]}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.trackingNumber && (
                    <div className="bg-info-bg rounded-control p-3 text-sm">
                      <span className="text-info font-medium">
                        Tracking:{" "}
                      </span>
                      <span className="text-info">
                        {order.trackingNumber}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-line-strong">
                    <span className="font-bold">
                      Total:{" "}
                      {orderCurrency
                        ? formatCurrency(safeTotal, orderCurrency)
                        : `${safeTotal.toLocaleString()} (mixed currencies)`}
                    </span>
                    {order.status === "pending" && (
                      <Link
                        href={`/store/pay/${order.id}`}
                        className="px-4 py-2 bg-success text-on-success rounded-control font-bold text-sm hover:bg-success transition"
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
