import React, { useState } from "react";
import { ShoppingCart, Truck } from "lucide-react";
import { Order } from "@/types/store";
import { formatCurrency } from "@/types/currency";
import { resolveHistoricalCurrency } from "@/lib/money/historicalCurrency";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SearchInput,
  Select,
} from "@/components/ui";

const STATUS_TONE: Record<
  Order["status"],
  "warning" | "success" | "info" | "brand" | "neutral" | "danger"
> = {
  pending: "warning",
  paid: "success",
  processing: "info",
  shipped: "brand",
  delivered: "neutral",
  cancelled: "danger",
};

export default function OrdersList({
  orders,
  onUpdateStatus,
}: {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order["status"]) => void;
  currency?: string;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredOrders = orders.filter((order) => {
    if (filter !== "all" && order.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesName = order.buyerName?.toLowerCase().includes(q);
      const matchesEmail = order.buyerEmail?.toLowerCase().includes(q);
      const matchesItem = order.items?.some((item) =>
        item.productName?.toLowerCase().includes(q),
      );
      if (!matchesName && !matchesEmail && !matchesItem) return false;
    }
    return true;
  });

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart className="size-6" aria-hidden="true" />}
        title="No orders yet"
        description="Customer store orders will appear here as soon as purchases come in."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          aria-label="Search orders"
          placeholder="Search buyer or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="flex-1 sm:max-w-md"
        />
        <Select
          aria-label="Filter order status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          containerClassName="w-full sm:w-44"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="size-6" aria-hidden="true" />}
          title="No matching orders"
          description="Try clearing your search or choosing another status filter."
        />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {filteredOrders.map((order) => (
            <div key={order.id} className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-body font-bold text-fg">{order.buyerName}</h3>
                  {order.buyerEmail && (
                    <p className="truncate text-label text-muted-fg">{order.buyerEmail}</p>
                  )}
                </div>
                <Badge tone={STATUS_TONE[order.status] ?? "neutral"} className="capitalize">
                  {order.status}
                </Badge>
              </div>

              <div className="space-y-2 rounded-control bg-surface-sunken p-4">
                {(() => {
                  const orderCurrency = resolveHistoricalCurrency(
                    order as unknown as Record<string, unknown>,
                  );
                  return (
                    <>
                      {order.items.map((item, idx) => {
                        const itemCurrency = resolveHistoricalCurrency(
                          item as unknown as Record<string, unknown>,
                          { fallbackCurrency: orderCurrency },
                        );
                        return (
                          <div key={idx} className="flex justify-between gap-3 text-label">
                            <span className="text-fg">
                              <span className="tabular-nums font-semibold">
                                {item.quantity}x
                              </span>{" "}
                              {item.productName}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-fg">
                              {formatCurrency(item.price, itemCurrency)}
                            </span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between border-t border-line pt-2.5 text-body font-bold">
                        <span>Total</span>
                        <span className="tabular-nums">
                          {formatCurrency(order.total, orderCurrency)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {order.shippingAddress && (
                <div className="flex items-start gap-2.5 rounded-control bg-info-bg p-3 text-label text-info">
                  <Truck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {order.shippingAddress.fullName}, {order.shippingAddress.address},{" "}
                    {order.shippingAddress.city}
                    {order.trackingNumber && (
                      <span className="ml-2 font-mono font-bold">
                        #{order.trackingNumber}
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {order.status === "paid" && (
                  <Button
                    size="sm"
                    onClick={() => onUpdateStatus(order.id, "processing")}
                  >
                    Start Processing
                  </Button>
                )}
                {order.status === "processing" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onUpdateStatus(order.id, "shipped")}
                    >
                      Mark as Shipped
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onUpdateStatus(order.id, "paid")}
                    >
                      Back to Paid
                    </Button>
                  </>
                )}
                {order.status === "shipped" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onUpdateStatus(order.id, "delivered")}
                    >
                      Mark as Delivered
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onUpdateStatus(order.id, "processing")}
                    >
                      Back to Processing
                    </Button>
                  </>
                )}
                {order.status === "delivered" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onUpdateStatus(order.id, "shipped")}
                  >
                    Back to Shipped
                  </Button>
                )}
                {order.status === "cancelled" && (
                  <Button
                    size="sm"
                    onClick={() => onUpdateStatus(order.id, "pending")}
                  >
                    Reopen Order
                  </Button>
                )}
                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onUpdateStatus(order.id, "cancelled")}
                    className="border border-line text-danger hover:bg-danger-bg"
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
