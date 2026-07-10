import React, { useState } from "react";
import { ShoppingCart, Search, Truck } from "lucide-react";
import { Order, getProductCurrency, getProductPrice } from "@/types/store";
import { formatCurrency } from "@/types/currency";

export default function OrdersList({
  orders,
  onUpdateStatus,
}: {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order["status"]) => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredOrders = orders.filter((order) => {
    if (filter !== "all" && order.status !== filter) return false;
    if (search && order.buyerName.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-orange-100 text-orange-700",
    delivered: "bg-border text-foreground",
    cancelled: "bg-red-100 text-red-700",
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <ShoppingCart size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-muted-foreground font-medium">No orders yet</p>
        <p className="text-muted-foreground text-sm mt-2">
          Orders will appear here when customers make purchases
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
          />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border-strong rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-card border border-border-strong rounded-lg py-3 px-4 text-sm outline-none"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="p-6 border-b border-border last:border-0"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold">{order.buyerName}</h4>
                <p className="text-sm text-muted-foreground">{order.buyerEmail}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-3 py-1 rounded-full ${statusColors[order.status]}`}
              >
                {order.status.toUpperCase()}
              </span>
            </div>

            <div className="bg-muted rounded-lg p-4 mb-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.price, "RWF")}
                  </span>
                </div>
              ))}
              <div className="border-t border-border-strong mt-3 pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total, "RWF")}</span>
              </div>
            </div>

            {order.shippingAddress && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                <Truck size={14} className="inline mr-2 text-blue-600" />
                <span className="text-blue-800">
                  {order.shippingAddress.fullName},{" "}
                  {order.shippingAddress.address}, {order.shippingAddress.city}
                  {order.trackingNumber && (
                    <span className="ml-2 font-bold">
                      #{order.trackingNumber}
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {order.status === "paid" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "processing")}
                  className="px-4 py-2 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  Start Processing
                </button>
              )}
              {order.status === "processing" && (
                <>
                  <button
                    onClick={() => onUpdateStatus(order.id, "shipped")}
                    className="px-4 py-2 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    Mark as Shipped
                  </button>
                  <button
                    onClick={() => onUpdateStatus(order.id, "paid")}
                    className="px-4 py-2 text-xs font-bold border border-slate-300 text-muted-foreground rounded-lg hover:bg-card-hover transition"
                  >
                    Back to Paid
                  </button>
                </>
              )}
              {order.status === "shipped" && (
                <>
                  <button
                    onClick={() => onUpdateStatus(order.id, "delivered")}
                    className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Mark as Delivered
                  </button>
                  <button
                    onClick={() => onUpdateStatus(order.id, "processing")}
                    className="px-4 py-2 text-xs font-bold border border-slate-300 text-muted-foreground rounded-lg hover:bg-card-hover transition"
                  >
                    Back to Processing
                  </button>
                </>
              )}
              {order.status === "delivered" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "shipped")}
                  className="px-4 py-2 text-xs font-bold border border-slate-300 text-muted-foreground rounded-lg hover:bg-card-hover transition"
                >
                  Back to Shipped
                </button>
              )}
              {order.status === "cancelled" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "pending")}
                  className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Reopen Order
                </button>
              )}
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "cancelled")}
                  className="px-4 py-2 text-xs font-bold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
