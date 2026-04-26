import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// Stripe webhook richiede raw body; in App Router:
export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature") ?? "";
  const payload = await req.text();

  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature mismatch", err);
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sess = event.data.object as Stripe.Checkout.Session;
        const userId = sess.metadata?.userId ?? sess.client_reference_id;
        const plan = sess.metadata?.plan;
        if (userId && (plan === "PRO" || plan === "EDU")) {
          const customer = typeof sess.customer === "string" ? sess.customer : sess.customer?.id ?? null;
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan,
              stripeCustomerId: customer,
              subscriptionStatus: "active",
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const status = sub.status;
        const plan = status === "active" || status === "trialing" ? undefined : "FREE";
        await prisma.user.updateMany({
          where: { stripeCustomerId: customer },
          data: { subscriptionStatus: status, ...(plan ? { plan } : {}) },
        });
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error", e);
  }

  return NextResponse.json({ received: true });
}
