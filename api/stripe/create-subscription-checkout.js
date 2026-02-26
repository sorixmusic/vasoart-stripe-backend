import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { planType, userId, email, successUrl, cancelUrl } = req.body;

    const priceMap = {
      "1_month": process.env.STRIPE_PRICE_1_MONTH,
      "6_months": process.env.STRIPE_PRICE_6_MONTHS,
      "1_year": process.env.STRIPE_PRICE_1_YEAR
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceMap[planType], quantity: 1 }],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planType }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
