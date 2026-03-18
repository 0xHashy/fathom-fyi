// Stripe helpers — pure fetch + crypto, no stripe SDK dependency.

import { createHmac, timingSafeEqual } from 'crypto';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Verify Stripe webhook signature
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET || !signatureHeader) return false;

  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) return false;

  // Reject if timestamp is more than 5 minutes old
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;

  const expected = createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Fetch a Stripe Checkout Session
export async function getCheckoutSession(sessionId) {
  if (!STRIPE_SECRET) return null;

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items&expand[]=customer`,
    {
      headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
    }
  );

  if (!res.ok) return null;
  return res.json();
}

// Determine tier from Stripe product/price name
export function tierFromProductName(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('trading bot')) return 'trading_bot';
  if (lower.includes('pro')) return 'pro';
  if (lower.includes('starter')) return 'starter';
  return 'starter'; // default paid tier
}

// Generate a secure API key
export function generateApiKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'fathom_sk_';
  const bytes = new Uint8Array(32);
  require('crypto').randomFillSync(bytes);
  for (const b of bytes) {
    key += chars[b % chars.length];
  }
  return key;
}
