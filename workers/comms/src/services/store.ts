import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const storeOrder: EmailService = {
  purpose: "store_order",
  async resolveRecipients(data) {
    return { to: data.buyerEmail as string };
  },
  buildSubject(data) {
    return `Order Confirmed - ${data.creatorName as string} via Agaseke`;
  },
  async buildTemplateData(data) {
    const items = data.items as Array<{ name: string; quantity: number; price: number }> | undefined;
    const itemsHtml = items?.length
      ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;">
           <tr style="border-bottom:2px solid #eee;">
             <th style="padding:8px 4px;text-align:left;color:#888;font-size:13px;">Item</th>
             <th style="padding:8px 4px;text-align:center;color:#888;font-size:13px;">Qty</th>
             <th style="padding:8px 4px;text-align:right;color:#888;font-size:13px;">Price</th>
           </tr>
           ${items.map((i) => `<tr style="border-bottom:1px solid #f0f0f0;">
             <td style="padding:8px 4px;">${i.name}</td>
             <td style="padding:8px 4px;text-align:center;">${i.quantity}</td>
             <td style="padding:8px 4px;text-align:right;">${i.price.toLocaleString()} RWF</td>
           </tr>`).join("")}
           <tr>
             <td colspan="2" style="padding:8px 4px;font-weight:600;">Total</td>
             <td style="padding:8px 4px;text-align:right;font-weight:600;">${(data.total as number).toLocaleString()} RWF</td>
           </tr>
         </table>`
      : `<p>Total: ${(data.total as number).toLocaleString()} RWF</p>`;

    return {
      headerColor: "#059669",
      headerTitle: "Order Confirmed",
      title: `Thank you for your purchase, ${data.buyerName as string}!`,
      body: `<p>Your order from <strong>${data.creatorName as string}</strong> has been confirmed.</p>
             <p style="font-size:13px;color:#888;">Order ID: ${data.orderId as string}</p>
             ${itemsHtml}`,
      ctaText: "View Order",
      ctaUrl: `${data.appUrl}/supporter`,
    };
  },
};

export const storeStatus: EmailService = {
  purpose: "store_status",
  async resolveRecipients(data) {
    return { to: data.buyerEmail as string };
  },
  buildSubject(data) {
    const status = data.newStatus as string;
    const labels: Record<string, string> = {
      processing: "Your Order is Being Processed",
      shipped: "Your Order Has Been Shipped",
      delivered: "Your Order Has Been Delivered",
      cancelled: "Your Order Has Been Cancelled",
      reopened: "Your Order Has Been Reopened",
    };
    return labels[status] || `Order Status Updated: ${status}`;
  },
  async buildTemplateData(data) {
    const status = data.newStatus as string;
    const colors: Record<string, string> = {
      processing: "#f59e0b",
      shipped: "#2563eb",
      delivered: "#059669",
      cancelled: "#dc2626",
      reopened: "#8b5cf6",
    };
    const labels: Record<string, string> = {
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      reopened: "Reopened",
    };

    return {
      headerColor: colors[status] || "#6b7280",
      headerTitle: labels[status] || status,
      title: `Your order from ${data.creatorName as string} is ${labels[status] || status}`,
      body: `<p>Your order status has been updated.</p>
             <table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;">Order</td><td style="padding:6px 0;">${data.orderId as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Status</td><td style="padding:6px 0;font-weight:600;text-transform:capitalize;">${labels[status] || status}</td></tr>
               ${data.trackingNumber ? `<tr><td style="padding:6px 0;color:#888;">Tracking</td><td style="padding:6px 0;">${data.trackingNumber as string}</td></tr>` : ""}
             </table>
             ${(data.items as Array<{ name: string; quantity: number }>)?.length
               ? `<p><strong>Items:</strong></p><ul>${(data.items as Array<{ name: string; quantity: number }>).map((i: { name: string; quantity: number }) => `<li>${i.name} x${i.quantity}</li>`).join("")}</ul>`
               : ""}`,
    };
  },
};
