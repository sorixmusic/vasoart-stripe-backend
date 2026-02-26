import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const ALLOWED_ORIGIN = "https://vasoart.shop";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Acceptă ambele variante:
    // 1) /api/stripe/verify-session?session_id=abc
    // 2) /api/stripe/verify-session/abc

    const sessionId =
      req.query?.session_id ||
      req.query?.sessionId ||
      req.query?.id ||
      req.query?.sid ||
      req.url?.split("/").pop();

    if (!sessionId) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.status(200).json({
      id: session.id,
      mode: session.mode,
      status: session.status,
      payment_status: session.payment_status,
      amountTotal: session.amount_total,
      customerEmail: session.customer_details?.email,
      metadata: session.metadata || {},
    });
  } catch (err) {
    console.error("verify-session error:", err);
    return res.status(500).json({
      error: err?.message || "Stripe verification failed",
    });
  }
}
