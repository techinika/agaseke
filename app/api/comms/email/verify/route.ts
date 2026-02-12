import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const uid = formData.get("uid");
    const accountName = formData.get("accountName");
    const bankName = formData.get("bankName");
    const accountNumber = formData.get("accountNumber");
    const country = formData.get("country");
    const payoutPreference = formData.get("payoutPreference");
    const swiftCode = formData.get("swiftCode") || "N/A";

    const file = formData.get("idFile") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No ID file uploaded" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Agaseke Verification" <${process.env.SMTP_USER}>`,
      to: `${process.env.SMTP_USER}`,
      subject: `New KYC Verification Request: ${accountName}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>New Creator Verification Request</h2>
          <p>A creator has submitted their identity documents for review.</p>
          <div style="margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 10px; background-color: #f9f9f9;">
          <p><b>Creator UID:</b> ${uid}</p>
          <p><b>Full Name:</b> ${accountName}</p>
          <p><b>Country:</b> ${country}</p>
          <p><b>Payout Mode:</b> ${payoutPreference?.toString().toUpperCase()}</p>
          <p><b>Bank/Provider:</b> ${bankName}</p>
          <p><b>Account Number:</b> ${accountNumber}</p>
          <p><b>SWIFT Code:</b> ${swiftCode}</p>
          </div>
          <p><i>The identity document is attached to this email. Please review it against the provided details in the Agaseke Admin Console.</i></p>
        </div>
      `,
      attachments: [
        {
          filename: file.name,
          content: buffer,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error: any) {
    console.error("Email API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
