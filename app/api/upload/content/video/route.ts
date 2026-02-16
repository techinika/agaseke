import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export async function POST(req: Request) {
  try {
    const { video, creatorHandle, isPublic } = await req.json();

    if (!video) {
      return NextResponse.json({ error: "No video data" }, { status: 400 });
    }

    const uploadResponse = (await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(
        video,
        {
          resource_type: "video",
          folder: `agaseke/videos/${creatorHandle}`,
          type: isPublic ? "upload" : "authenticated",
          chunk_size: 6000000,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
    })) as any;

    return NextResponse.json(
      {
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
      },
      { status: 200 },
    );
  } catch (error: any) {
    // This log will appear in your TERMINAL, not the browser
    console.error("CLOUDINARY_VIDEO_ERROR:", error);
    return NextResponse.json(
      { error: "Video upload failed", details: error.message },
      { status: 500 },
    );
  }
}
