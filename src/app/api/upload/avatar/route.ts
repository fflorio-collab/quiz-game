import { NextRequest, NextResponse } from "next/server";
import { isCloudinaryConfigured, uploadBuffer } from "@/lib/cloudinary";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary non configurato: mancano CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET" },
      { status: 500 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type))
    return NextResponse.json({ error: "Formato non supportato (usa jpg, png, gif, webp)" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File troppo grande (max 5 MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadBuffer(buffer, {
    resource_type: "image",
    folder: "quiz-game/avatars",
  });

  return NextResponse.json({ url: result.secure_url });
}
