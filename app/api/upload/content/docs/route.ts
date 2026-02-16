import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { file, creatorHandle, type } = await req.json();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadResponse = await cloudinary.uploader.upload(file, {
      folder: `agaseke/documents/${type || "general"}/${creatorHandle}`,

      resource_type: "auto",

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
      { error: "Document upload failed" },
      { status: 500 },
    );
  }
}
