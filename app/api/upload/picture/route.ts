import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { rateLimitByIp } from "@/lib/rateLimit";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, { max: 5, interval: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
  }
  const { image } = await request.json();

  try {
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "creator_profiles",
    });
    return NextResponse.json({ url: uploadResponse.secure_url });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
