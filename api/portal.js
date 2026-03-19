// Stripe Customer Portal — lets customers manage subscription, cancel, update payment

const STRIPE_SK = process.env.STRIPE_SECRET_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.session_id;
  const email = req.query.email;

  if (!sessionId && !email) {
    return res.status(400).json({ error: 'Provide session_id or email' });
  }

  try {
    let customerId;

    if (sessionId) {
      // Look up customer from checkout session
      const sessionRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
        { headers: { Authorization: `Bearer ${STRIPE_SK}` } }
      );
      if (!sessionRes.ok) return res.status(404).json({ error: 'Session not found' });
      const session = await sessionRes.json();
      customerId = session.customer;
    } else if (email) {
      // Look up customer by email
      const custRes = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
        { headers: { Authorization: `Bearer ${STRIPE_SK}` } }
      );
      const custData = await custRes.json();
      if (!custData.data || custData.data.length === 0) {
        return res.status(404).json({ error: 'No subscription found for this email' });
      }
      customerId = custData.data[0].id;
    }

    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Create Stripe Customer Portal session
    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SK}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `customer=${customerId}&return_url=${encodeURIComponent('https://fathom.fyi')}`,
    });

    if (!portalRes.ok) {
      const err = await portalRes.json();
      return res.status(500).json({ error: 'Portal creation failed', detail: err.error?.message });
    }

    const portal = await portalRes.json();
    res.redirect(303, portal.url);
  } catch (err) {
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
