import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

// GET = controllo stato auth (per l'auto-detect lato client). Restituisce 200
// solo se il cookie admin-token corrisponde a ADMIN_PASSWORD.
export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

export async function POST(req: Request) {
  const { password } = await req.json();
  const correct = process.env.ADMIN_PASSWORD || "admin";
  if (password !== correct) {
    return NextResponse.json(
      { success: false, error: "Password errata" },
      { status: 401 }
    );
  }
  // Semplice token in sessione (cookie httpOnly)
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin-token", password, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 ore
    path: "/",
  });
  return response;
}
