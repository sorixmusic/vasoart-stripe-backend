import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ALLOWED_ORIGIN = "https://vasoart.shop"; // domeniul tău live

export default async function handler(req, res) {
  // ✅ CORS (obligatoriu pentru request din browser)
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { planType, userId, email, successUrl, cancelUrl } = req.body || {};

    if (!planType || !userId || !email || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: "Missing required fields",
        details: { planType, userId, email, successUrl, cancelUrl },
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
        error: "Invalid planType or missing price env var",
        validPlanTypes: Object.keys(priceMap),
        receivedPlanType: planType,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planType },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("create-subscription-checkout error:", err);
    return res.status(500).json({
      error: err?.message || "Stripe error",
      type: err?.type,
      code: err?.code,
    });
  }
}
