import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file    = formData.get("file")    as File   | null;
    const guestId = formData.get("guestId") as string | null;

    if (!file || !guestId) {
      return NextResponse.json({ error: "File o ID ospite mancante" }, { status: 400 });
    }
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Il file deve essere un video" }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Il video non può superare i 50 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await new Promise<{ public_id: string; secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "video",
              folder: "vibecheck-wedding/guest-videos",
              public_id: `guest-${guestId}`,
              transformation: [{ duration: "15", quality: "auto", fetch_format: "mp4" }],
            },
            (err: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
              if (err || !result) reject(err ?? new Error("Upload failed"));
              else resolve(result as { public_id: string; secure_url: string });
            }
          )
          .end(buffer);
      }
    );

    const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
      resource_type: "video",
      format: "jpg",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "auto" },
        { quality: "auto" },
      ],
    });

    const { error: dbError } = await supabaseAdmin
      .from("guests")
      .update({
        video_url:     uploadResult.secure_url,
        thumbnail_url: thumbnailUrl,
      })
      .eq("id", guestId);

    if (dbError) {
      console.error("DB update error:", dbError);
      return NextResponse.json({ error: "Video caricato, ma errore nel salvataggio nel database" }, { status: 500 });
    }

    return NextResponse.json({
      success:       true,
      video_url:     uploadResult.secure_url,
      thumbnail_url: thumbnailUrl,
      public_id:     uploadResult.public_id,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Errore interno durante l'elaborazione del video" }, { status: 500 });
  }
}
