/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, phone, network } = await request.json();

    if (!orderId || !amount || !phone || !network) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const orderDocRef = `storeOrders/${orderId}`;
    
    return NextResponse.json({
      success: true,
      message: "Payment initiated. You will receive a prompt on your phone.",
      checkoutUrl: `/store/pay/${orderId}`,
    });
  } catch (error) {
    console.error("Store payment error:", error);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}