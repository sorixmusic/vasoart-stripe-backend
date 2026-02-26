import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment variables");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// Permite doar site-ul tău (și localhost dacă vrei)
const allowedOrigins = new Set([
  "https://vasoart.shop",
  "http://localhost:5173",
]);

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (allowedOrigins.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { resourceId, userId, successUrl, cancelUrl } = req.body || {};

    if (!resourceId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: "Missing required fields: resourceId, successUrl, cancelUrl",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Resource ${resourceId}` },
            unit_amount: 1, // ✅ €0.01 (1 cent)
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        resourceId,
        userId: userId || "",
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error("create-pay-per-download error:", e);
    return res.status(500).json({ error: e?.message || "Stripe error" });
  }
}
