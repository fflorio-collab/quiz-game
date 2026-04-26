import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/lib/auth";

/**
 * Ritorna un JWT minimale firmato con AUTH_SECRET contenente l'userId della sessione corrente.
 * Usato dal client (useSocket) per autenticare la connessione socket.io al server Node.
 * Il server socket verifica lo stesso segreto.
 *
 * Se non loggato: { token: null }.
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ token: null });

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ token: null });

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({ token });
}
