import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// IMPORTANT: Vercel trebuie să primească body RAW pentru semnătură Stripe
export const config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  // Dacă deschizi în browser, va fi GET -> răspundem cu 200 ca să nu „crape”
  if (req.method === "GET") {
    return res.status(200).send("OK");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ evenimentul cel mai important pentru tine
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("checkout.session.completed", {
      mode: session.mode,
      email: session.customer_email,
      metadata: session.metadata,
      subscription: session.subscription,
    });

    // aici vei face update în DB (PocketBase) după ce confirmăm că webhook-ul merge
  }

  return res.status(200).json({ received: true });
}
