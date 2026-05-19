import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const creatorHandle = formData.get("creatorHandle") as string;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Video file too large. Maximum size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const uploadResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(
        dataUri,
        {
          resource_type: "video",
          folder: `agaseke/videos/${creatorHandle}`,
          chunk_size: 6000000,
          access_control: [{ access_type: "anonymous" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
    }) as any;

    return NextResponse.json(
      {
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("CLOUDINARY_VIDEO_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Video upload failed" },
      { status: 500 },
    );
  }
}
