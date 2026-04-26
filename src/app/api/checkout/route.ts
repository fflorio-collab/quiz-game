import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Crea una Stripe Checkout Session per upgrade a PRO o EDU.
 * Richiede che l'utente sia loggato. Se STRIPE_SECRET_KEY non è configurato
 * ritorna 503 con messaggio per contattare il team.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({ plan: null }));
  if (plan !== "PRO" && plan !== "EDU") {
    return NextResponse.json({ error: "Piano non valido" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      {
        error:
          "Pagamenti non ancora attivi. Contattaci a hello@superfabri.app per l'abbonamento.",
      },
      { status: 503 }
    );
  }

  const priceId = plan === "PRO"
    ? process.env.STRIPE_PRICE_ID_PRO_MONTH
    : process.env.STRIPE_PRICE_ID_EDU_MONTH;
  if (!priceId) {
    return NextResponse.json({ error: "Prezzo non configurato" }, { status: 503 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User non trovato" }, { status: 404 });

  const stripe = new Stripe(stripeKey);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      customer: user.stripeCustomerId ?? undefined,
      client_reference_id: userId,
      metadata: { userId, plan },
      success_url: `${baseUrl}/profile?upgraded=${plan.toLowerCase()}`,
      cancel_url: `${baseUrl}/pricing`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: "Errore creazione sessione" }, { status: 500 });
  }
}
