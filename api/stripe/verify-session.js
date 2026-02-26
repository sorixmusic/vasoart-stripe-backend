import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ALLOWED_ORIGIN = "https://vasoart.shop";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const sessionId = req.query?.session_id;
  if (!sessionId) return res.status(400).json({ error: "Missing session_id" });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.status(200).json({
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      mode: session.mode,
      customer_email: session.customer_details?.email || session.customer_email,
      subscription: session.subscription,
      metadata: session.metadata,
    });
  } catch (err) {
    console.error("verify-session error:", err);
    return res.status(500).json({ error: err?.message || "Stripe error" });
  }
}
