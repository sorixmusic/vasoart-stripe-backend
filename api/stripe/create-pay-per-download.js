import Stripe from "stripe";

const ALLOWED_ORIGINS = new Set([
  "https://vasoart.shop",
  "http://localhost:5173", // optional pentru test
]);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in Vercel Environment Variables");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // fallback safe
    res.setHeader("Access-Control-Allow-Origin", "https://vasoart.shop");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { resourceId, userId, successUrl, cancelUrl } = req.body || {};

    if (!resourceId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: "Missing required fields: resourceId, successUrl, cancelUrl",
      });
    }

    // IMPORTANT: Stripe cere integer în cents (ex: 199 = €1.99)
    // Dacă vrei test gratis: pune 0 (dar Stripe poate refuza “0 amount” în unele cazuri)
    const unitAmountCents = 199; // €1.99

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Resource ${resourceId}` },
            unit_amount: unitAmountCents,
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
    return res.status(e?.statusCode || 500).json({
      error: e?.message || e?.raw?.message || "Stripe error",
      type: e?.type,
      code: e?.code,
    });
  }
}
