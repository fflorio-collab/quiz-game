import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Formato non supportato (usa jpg, png, gif, webp)" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File troppo grande (max 5 MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", "avatars");

  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buffer);

  return NextResponse.json({ url: `/uploads/avatars/${filename}` });
}
