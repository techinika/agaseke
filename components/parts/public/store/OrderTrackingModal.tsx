import { useState, useEffect, useRef } from "react";
import { Truck, X, Check, Download, Loader } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import { Order, Product, getProductCurrency } from "./types";
import { downloadProduct } from "@/lib/downloadProduct";
import { cancelStoreOrder } from "@/lib/paymentsService";
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
  onOrderCancelled,
  onClose,
}: {
  orders: Order[];
  products?: Product[];
  uid?: string;
  onOrderCancelled?: (orderId: string) => void;
  onClose: () => void;
}) {
  const [downloadingProduct, setDownloadingProduct] = useState<string | null>(
    null,
  );
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [locallyCancelledIds, setLocallyCancelledIds] = useState<Set<string>>(
    new Set(),
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

  const handleCancelOrder = async (orderId: string) => {
    if (!orderId || cancellingOrderId) return;
    setCancellingOrderId(orderId);
    try {
      await cancelStoreOrder(orderId);
      setLocallyCancelledIds((prev) => {
        const next = new Set(prev);
        next.add(orderId);
        return next;
      });
      onOrderCancelled?.(orderId);
      toast.success("Order cancelled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel order");
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-surface shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-line p-4 sm:p-6">
          <h2 className="text-xl font-bold">My Orders</h2>
          <button
            type="button"
            aria-label="Close orders"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full transition hover:bg-surface-sunken"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-6 sm:p-6">
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
              const legacyOrder = order as Order & {
                totalAmount?: number;
                currency?: string;
                productId?: string;
                productName?: string;
                quantity?: number;
                productPrice?: number;
              };
              const safeTotal =
                typeof legacyOrder.total === "number"
                  ? legacyOrder.total
                  : typeof legacyOrder.totalAmount === "number"
                    ? legacyOrder.totalAmount
                    : 0;

              const orderItems = legacyOrder.items
                ? legacyOrder.items
                : [
                    {
                      productId: legacyOrder.productId || "",
                      productName: legacyOrder.productName || "Product",
                      quantity: legacyOrder.quantity ?? 1,
                      price: legacyOrder.productPrice ?? 0,
                    },
                  ];
              const explicitOrderCurrency = legacyOrder.currency;
              const orderCurrencies = Array.from(
                new Set(
                  orderItems.map(
                    (item) =>
                      explicitOrderCurrency || itemCurrency(item.productId),
                  ),
                ),
              );
              const orderCurrency =
                explicitOrderCurrency ||
                (orderCurrencies.length === 1 ? orderCurrencies[0] : null);
              const effectiveStatus = locallyCancelledIds.has(order.id)
                ? "cancelled"
                : order.status;
              const isPaidOrder =
                effectiveStatus === "paid" ||
                effectiveStatus === "processing" ||
                effectiveStatus === "shipped" ||
                effectiveStatus === "delivered";
              const canCancelOrder =
                effectiveStatus === "pending" &&
                (order as Order & { paymentStatus?: string }).paymentStatus !== "paid";

              const createdDate =
                order.createdAt instanceof Timestamp
                  ? order.createdAt.toDate()
                  : typeof (order.createdAt as unknown as { toDate?: () => Date })?.toDate ===
                      "function"
                    ? (order.createdAt as unknown as { toDate: () => Date }).toDate()
                    : new Date(order.createdAt as unknown as string | number | Date);

              return (
                <div key={order.id} className="rounded-control bg-surface-sunken p-4 sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-caption text-muted-fg">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-label text-muted-fg">
                        {createdDate.toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-control px-2.5 py-1 text-caption font-bold ${statusColors[effectiveStatus] || "bg-surface-sunken text-fg"}`}
                    >
                      {(effectiveStatus || "unknown").toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {orderItems.map((item, idx: number) => {
                      const productObj = products.find(
                        (p) => p.id === item.productId,
                      );
                      const canDownload =
                        isPaidOrder &&
                        Boolean(item.productId) &&
                        (!productObj ||
                          productObj.type === "digital" ||
                          Boolean(productObj.fileUrl));
                      const isDownloading =
                        downloadingProduct === item.productId;

                      return (
                        <div
                          key={idx}
                          className="flex justify-between text-sm items-center"
                        >
                          <span>
                            {item.quantity}x {item.productName || "Product"}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-medium tabular-nums">
                              {formatCurrency(
                                typeof item.price === "number" ? item.price : 0,
                                explicitOrderCurrency ||
                                  itemCurrency(item.productId),
                              )}
                            </span>
                            {canDownload && (
                              <button
                                type="button"
                                disabled={isDownloading}
                                onClick={() => handleDownload(item.productId)}
                                className="text-success hover:bg-success-bg p-1 rounded transition disabled:opacity-50"
                                title="Download"
                                aria-label="Download product"
                              >
                                {isDownloading ? (
                                  <Loader size={14} className="animate-spin" />
                                ) : (
                                  <Download size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {effectiveStatus !== "cancelled" && (
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        {statusSteps.map((step, idx) => (
                          <div key={step} className="flex items-center">
                            <div
                              className={`flex size-7 items-center justify-center rounded-full text-caption font-bold sm:size-8 ${
                                getStatusIndex(effectiveStatus) >= idx
                                  ? "bg-brand-strong text-on-brand"
                                  : "bg-border-strong text-muted-fg"
                              }`}
                            >
                              {getStatusIndex(effectiveStatus) > idx ? (
                                <Check size={14} />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            {idx < statusSteps.length - 1 && (
                              <div
                                className={`h-0.5 w-4 sm:w-8 ${
                                  getStatusIndex(effectiveStatus) > idx
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

                  <div className="mt-4 flex flex-col gap-3 border-t border-line-strong pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-bold tabular-nums">
                      Total:{" "}
                      {orderCurrency
                        ? formatCurrency(safeTotal, orderCurrency)
                        : `${safeTotal.toLocaleString()} (mixed currencies)`}
                    </span>
                    {canCancelOrder && (
                      <div className="grid grid-cols-2 gap-2.5 sm:w-auto sm:min-w-[240px]">
                        <button
                          type="button"
                          disabled={cancellingOrderId === order.id}
                          onClick={() => void handleCancelOrder(order.id)}
                          className="flex min-h-11 items-center justify-center whitespace-nowrap rounded-control border border-danger/30 bg-danger-bg px-3 py-2 text-label font-bold text-danger transition hover:opacity-90 disabled:opacity-50"
                        >
                          {cancellingOrderId === order.id ? "Cancelling..." : "Cancel Order"}
                        </button>
                        <Link
                          href={`/store/pay/${order.id}`}
                          className="flex min-h-11 items-center justify-center whitespace-nowrap rounded-control bg-success px-3 py-2 text-label font-bold text-on-success transition hover:opacity-90"
                        >
                          Pay Now
                        </Link>
                      </div>
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
