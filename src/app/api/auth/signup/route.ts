import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  username: z
    .string()
    .min(3, "L'username deve avere almeno 3 caratteri")
    .max(20, "Max 20 caratteri")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo lettere, numeri e underscore"),
  displayName: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const { email, password, username, displayName } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return NextResponse.json({ error: "Email già registrata" }, { status: 400 });

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) return NextResponse.json({ error: "Username già in uso" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      displayName: displayName ?? username,
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
