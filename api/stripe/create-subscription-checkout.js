import Stripe from "stripe";

const ALLOWED_ORIGINS = new Set([
  "https://vasoart.shop",
  "http://localhost:5173", // optional, pt test local
]);

function setCors(req, res) {
  const origin = req.headers.origin;
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://vasoart.shop";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Stripe-Signature"
  );
}

export default async function handler(req, res) {
  setCors(req, res);

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({
      error: "Missing STRIPE_SECRET_KEY in Vercel Environment Variables",
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  try {
    const { planType, userId, email, successUrl, cancelUrl } = req.body || {};

    if (!planType || !userId || !email || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: "Missing required fields: planType, userId, email, successUrl, cancelUrl",
      });
    }

    const priceMap = {
      "1_month": process.env.STRIPE_PRICE_1_MONTH,
      "6_months": process.env.STRIPE_PRICE_6_MONTHS,
      "1_year": process.env.STRIPE_PRICE_1_YEAR,
    };

    const priceId = priceMap[planType];
    if (!priceId) {
      return res.status(400).json({
        error: "Invalid planType OR missing Stripe price env var for that plan",
        receivedPlanType: planType,
        expectedPlanTypes: Object.keys(priceMap),
        envPresence: {
          STRIPE_PRICE_1_MONTH: !!process.env.STRIPE_PRICE_1_MONTH,
          STRIPE_PRICE_6_MONTHS: !!process.env.STRIPE_PRICE_6_MONTHS,
          STRIPE_PRICE_1_YEAR: !!process.env.STRIPE_PRICE_1_YEAR,
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planType,
      },
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("create-subscription-checkout error:", err);

    // Stripe errors usually have these fields:
    // err.type, err.code, err.message, err.raw?.message
    return res.status(err?.statusCode || 500).json({
      error: err?.message || err?.raw?.message || "Stripe error",
      type: err?.type,
      code: err?.code,
    });
  }
}
