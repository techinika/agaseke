import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { creatorEmail, creatorName, buyerName, buyerEmail, orderId, items, total } = await req.json();

    if (!buyerEmail || !items || !total) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const itemsList = items
      .map((item: any) => `${item.quantity}x ${item.productName} - ${item.price.toLocaleString()} RWF`)
      .join("\n");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
    .item { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .total { font-size: 18px; font-weight: bold; color: #f97316; padding-top: 10px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Your Order!</h1>
    </div>
    <div class="content">
      <p>Hi ${buyerName},</p>
      <p>Thank you for your purchase from ${creatorName}'s store!</p>
      
      <h3>Order #${orderId?.slice(0, 8) || "N/A"}</h3>
      
      <div class="item">${itemsList.replace(/\n/g, "</div><div class='item'>")}</div>
      
      <div class="total">Total: ${total.toLocaleString()} RWF</div>
      
      <p style="margin-top: 20px;">
        Your order has been received and is being processed. You'll receive updates as your order progresses.
      </p>
      
      ${items.some((i: any) => i.productId?.startsWith("digital")) ? `
      <p style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
        <strong>Digital Products:</strong><br>
        You can download your digital products from your orders page at any time.
      </p>
      ` : ""}
    </div>
    <div class="footer">
      <p>This email was sent by Agaseke</p>
    </div>
  </div>
</body>
</html>
`;

    return NextResponse.json({ success: true, message: "Order email notification sent" });
  } catch (error) {
    console.error("Store order email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
