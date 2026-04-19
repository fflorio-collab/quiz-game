import { NextResponse } from "next/server";

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
