import { useState, useEffect, useRef } from "react";
import { Package, Download, X, Loader } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Product, Order, getProductCurrency, getProductPrice } from "./types";
import { downloadProduct } from "@/lib/downloadProduct";
import { formatMoney as formatCurrency } from "@/lib/format/money";

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

  const currencyByProduct = new Map(
    products.map((product) => [product.id, getProductCurrency(product)]),
  );
  const fallbackCurrency = products[0] ? getProductCurrency(products[0]) : "RWF";
  const itemCurrency = (productId?: string) =>
    (productId && currencyByProduct.get(productId)) || fallbackCurrency;

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
          <h2 className="text-xl font-bold">My Purchases</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-sunken rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {purchasedItems.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-muted-fg mb-4" />
              <p className="text-muted-fg">No purchases yet</p>
            </div>
          ) : (
            purchasedItems.map((item, idx) => (
              <div
                key={idx}
                className="border border-line rounded-control p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-fg">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-muted-fg">
                      {item.quantity}x {formatCurrency(item.price, itemCurrency(item.productId))}
                      {item.selectedSize && ` - Size: ${item.selectedSize}`}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      item.orderStatus === "delivered"
                        ? "bg-surface-sunken text-fg"
                        : item.orderStatus === "shipped"
                          ? "bg-brand-soft text-brand-strong"
                          : item.orderStatus === "processing"
                            ? "bg-info-bg text-info"
                            : "bg-success-bg text-success"
                    }`}
                  >
                    {item.orderStatus.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => handleDownload(item.productId)}
                    className="flex items-center gap-2 px-3 py-2 bg-success-bg text-success rounded-control text-sm font-bold hover:bg-success-bg transition"
                  >
                    <Download size={14} />
                    {downloadingProduct === item.productId
                      ? "Downloading..."
                      : "Download"}
                  </button>

                  <Link
                    href={`/${creatorHandle}?tab=store`}
                    className="px-3 py-2 text-muted-fg hover:bg-surface-sunken rounded-control text-sm font-medium transition"
                  >
                    Buy Again
                  </Link>
                </div>

                <p className="text-xs text-muted-fg mt-2">
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
