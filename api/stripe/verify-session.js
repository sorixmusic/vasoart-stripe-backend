import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const ALLOWED_ORIGINS = new Set([
  "https://vasoart.shop",
  "https://www.vasoart.shop",
  "http://localhost:5173",
]);

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY in Vercel env" });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const sessionId = req.query?.session_id;
    if (!sessionId) return res.status(400).json({ error: "Missing session_id" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // normalize pentru frontend
    const metadata = session.metadata || {};
    const out = {
      id: session.id,
      mode: session.mode, // "payment" | "subscription"
      status: session.status, // "complete"
      payment_status: session.payment_status, // "paid"
      amountTotal: typeof session.amount_total === "number" ? session.amount_total : null,
      currency: session.currency || null,
      customerEmail:
        session.customer_details?.email ||
        session.customer_email ||
        null,

      subscriptionId: session.subscription || null,

      metadata,
      // helpers directe (ca să nu mai cauți în metadata)
      resourceId: metadata.resourceId || null,
      userId: metadata.userId || null,
      planType: metadata.planType || null,
    };

    return res.status(200).json(out);
  } catch (err) {
    console.error("verify-session error:", err);
    return res.status(500).json({
      error: err?.message || "Stripe error",
      type: err?.type,
      code: err?.code,
    });
  }
}
