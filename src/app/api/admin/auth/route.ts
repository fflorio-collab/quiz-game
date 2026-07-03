import { NextResponse } from "next/server";
import { isAdmin, checkAdminPassword, adminSessionToken } from "@/lib/admin-auth";

// GET = controllo stato auth (per l'auto-detect lato client). 200 solo se il
// cookie admin-token è un HMAC valido della password configurata.
export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: undefined }));
  const token = adminSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Area admin non configurata (manca ADMIN_PASSWORD)" },
      { status: 503 },
    );
  }
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ success: false, error: "Password errata" }, { status: 401 });
  }
  // Cookie httpOnly con l'HMAC (non la password in chiaro).
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin-token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 ore
    path: "/",
  });
  return response;
}
