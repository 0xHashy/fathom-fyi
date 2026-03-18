// GET /api/session?session_id=cs_xxx
// Returns the API key for a completed checkout session.
// Used by the success page to display the key after payment.
// Session → key mapping expires after 1 hour for security.

import { kvGet, isKvConfigured } from './_lib/kv.js';
import { getCheckoutSession } from './_lib/stripe.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  // Try KV first (fast path)
  if (isKvConfigured()) {
    const sessionRecord = await kvGet(`session:${sessionId}`);
    if (sessionRecord && sessionRecord.key) {
      return res.status(200).json({
        key: sessionRecord.key,
        tier: sessionRecord.tier,
      });
    }

    // Fallback: look up customer from Stripe session
    const session = await getCheckoutSession(sessionId);
    if (session && session.customer) {
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer.id;
      const customerRecord = await kvGet(`customer:${customerId}`);
      if (customerRecord && customerRecord.key) {
        return res.status(200).json({
          key: customerRecord.key,
          tier: customerRecord.tier,
        });
      }
    }
  }

  return res.status(404).json({
    error: 'Key not found. This can happen if payment is still processing. Wait 30 seconds and refresh.',
  });
}
