import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

/* eslint-disable @typescript-eslint/no-explicit-any */
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const creatorHandle = formData.get("creatorHandle") as string;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
      folder: `agaseke/documents/${type || "general"}/${creatorHandle}`,
      resource_type: "raw",
      access_control: [{ access_type: "anonymous" }],
      tags: ["creator_document", type],
    });

    return NextResponse.json(
      {
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
        format: uploadResponse.format,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Cloudinary Document Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "Document upload failed" },
      { status: 500 },
    );
  }
}
