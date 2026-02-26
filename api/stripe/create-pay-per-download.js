import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const allowed = new Set([
  "https://vasoart.shop",
  "https://www.vasoart.shop",
  "http://localhost:5173",
]);

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (allowed.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
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
            unit_amount: 199, // €1.99
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
    return res.status(500).json({ error: e?.message || "Stripe error" });
  }
}
