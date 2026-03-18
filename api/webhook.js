// POST /api/webhook
// Stripe webhook handler.
// Events handled:
//   checkout.session.completed → generate API key, store in KV
//   customer.subscription.deleted → deactivate API key
//
// Setup in Stripe:
//   1. Go to Developers > Webhooks > Add endpoint
//   2. URL: https://fathom-fyi.vercel.app/api/webhook
//   3. Events: checkout.session.completed, customer.subscription.deleted
//   4. Copy signing secret → add to Vercel as STRIPE_WEBHOOK_SECRET

import { verifyWebhookSignature, getCheckoutSession, tierFromProductName, generateApiKey } from './_lib/stripe.js';
import { kvSet, kvGet, isKvConfigured } from './_lib/kv.js';

// Disable body parsing — we need raw body for signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  // Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(rawBody);

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutComplete(event.data.object);
  } else if (event.type === 'customer.subscription.deleted') {
    await handleSubscriptionDeleted(event.data.object);
  }

  return res.status(200).json({ received: true });
}

async function handleCheckoutComplete(session) {
  if (!isKvConfigured()) return;

  const customerId = session.customer;
  const customerEmail = session.customer_details?.email || session.customer_email || '';

  // Get full session with line items to determine tier
  let tier = 'starter';
  if (session.id) {
    const fullSession = await getCheckoutSession(session.id);
    if (fullSession?.line_items?.data?.[0]?.description) {
      tier = tierFromProductName(fullSession.line_items.data[0].description);
    } else if (fullSession?.line_items?.data?.[0]?.price?.product?.name) {
      tier = tierFromProductName(fullSession.line_items.data[0].price.product.name);
    }
  }

  // Check if customer already has a key
  const existing = await kvGet(`customer:${customerId}`);
  if (existing && existing.key) {
    // Update tier on existing key
    const keyRecord = await kvGet(`key:${existing.key}`);
    if (keyRecord) {
      keyRecord.tier = tier;
      keyRecord.active = true;
      keyRecord.updated_at = new Date().toISOString();
      await kvSet(`key:${existing.key}`, keyRecord);
      await kvSet(`customer:${customerId}`, { ...existing, tier });
      return;
    }
  }

  // Generate new key
  const apiKey = generateApiKey();
  const now = new Date().toISOString();

  // Store key record
  await kvSet(`key:${apiKey}`, {
    tier,
    customer_id: customerId,
    email: customerEmail,
    active: true,
    created_at: now,
  });

  // Store customer → key mapping
  await kvSet(`customer:${customerId}`, {
    key: apiKey,
    tier,
    email: customerEmail,
    created_at: now,
  });

  // Store session → key mapping (for success page lookup)
  // Expires in 1 hour — only needed for immediate key display
  await kvSet(`session:${session.id}`, { key: apiKey, tier }, 3600);
}

async function handleSubscriptionDeleted(subscription) {
  if (!isKvConfigured()) return;

  const customerId = subscription.customer;
  const customerRecord = await kvGet(`customer:${customerId}`);

  if (customerRecord && customerRecord.key) {
    // Deactivate the key
    const keyRecord = await kvGet(`key:${customerRecord.key}`);
    if (keyRecord) {
      keyRecord.active = false;
      keyRecord.deactivated_at = new Date().toISOString();
      await kvSet(`key:${customerRecord.key}`, keyRecord);
    }
  }
}
