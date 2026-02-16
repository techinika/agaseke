import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { image, creatorHandle } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 },
      );
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: `agaseke/posts/${creatorHandle || "general"}`,
      resource_type: "image",
      transformation: [
        { width: 1200, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    return NextResponse.json(
      {
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
