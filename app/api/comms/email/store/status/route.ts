import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const statusMessages: Record<string, { subject: string; title: string; message: string; undoMessage?: string }> = {
  processing: {
    subject: "Your Order is Being Processed",
    title: "Order Processing Started",
    message: "Great news! Your order has been paid and is now being processed. We'll notify you once it's ready to ship.",
  },
  shipped: {
    subject: "Your Order Has Been Shipped",
    title: "Order Shipped",
    message: "Your order is on its way! You should receive it soon. We'll notify you when it's delivered.",
  },
  delivered: {
    subject: "Your Order Has Been Delivered",
    title: "Order Delivered",
    message: "Your order has been delivered. We hope you enjoy your purchase!",
  },
  cancelled: {
    subject: "Your Order Has Been Cancelled",
    title: "Order Cancelled",
    message: "Your order has been cancelled. If you have any questions, please contact the creator.",
  },
  pending: {
    subject: "Your Order Has Been Reopened",
    title: "Order Reopened",
    message: "Your order has been reopened. Please complete your payment to proceed.",
    undoMessage: "This order was previously cancelled and has been reopened.",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { buyerEmail, buyerName, creatorName, orderId, newStatus, previousStatus, items, total, trackingNumber } = await request.json();

    if (!buyerEmail || !orderId || !newStatus) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const statusInfo = statusMessages[newStatus];
    if (!statusInfo) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const itemsList = items
      ?.map((item: any) => `<div style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
        <span>${item.quantity}x ${item.productName}</span>
        <span style="float: right; font-weight: 600;">${item.price?.toLocaleString()} RWF</span>
      </div>`)
      .join("") || "";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f97316; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
    .order-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; }
    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; background: #fef3c7; color: #d97706; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${statusInfo.title}</h1>
    </div>
    <div class="content">
      <p>Hi ${buyerName},</p>
      
      ${statusInfo.undoMessage ? `<p style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 15px 0;">${statusInfo.undoMessage}</p>` : ""}
      
      <p>${statusInfo.message}</p>
      
      <div class="order-card">
        <div style="margin-bottom: 15px;">
          <span class="status-badge">${newStatus}</span>
        </div>
        
        ${itemsList ? `<div style="margin: 15px 0;">${itemsList}</div>` : ""}
        
        <div style="border-top: 2px solid #f97316; padding-top: 15px; margin-top: 15px;">
          <strong style="font-size: 18px;">Total: ${total?.toLocaleString()} RWF</strong>
        </div>
        
        ${trackingNumber ? `<div style="margin-top: 15px; padding: 12px; background: #e0f2fe; border-radius: 8px;">
          <strong>Tracking Number:</strong> ${trackingNumber}
        </div>` : ""}
      </div>
      
      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>${creatorName}</strong>
      </p>
    </div>
    <div class="footer">
      <p>This email was sent by Agaseke Platform</p>
      <p>&copy; ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

    await transporter.sendMail({
      from: `"${creatorName} via Agaseke" <${process.env.SMTP_USER}>`,
      to: buyerEmail,
      subject: statusInfo.subject,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order status email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}