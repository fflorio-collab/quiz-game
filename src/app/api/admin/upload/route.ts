import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { isCloudinaryConfigured, uploadBuffer } from "@/lib/cloudinary";

const ALLOWED_TYPES: Record<string, "image" | "video"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
};

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary non configurato: mancano CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET" },
      { status: 500 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nessun file ricevuto" }, { status: 400 });
  }

  const mediaType = ALLOWED_TYPES[file.type];
  if (!mediaType) {
    return NextResponse.json({ error: "Formato non supportato (JPEG, PNG, GIF, WebP, MP4, WebM)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File troppo grande (max 50 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadBuffer(buffer, {
    resource_type: mediaType,
    folder: "quiz-game/questions",
  });

  return NextResponse.json({ url: result.secure_url, mediaType });
}
