import { Router, Request, Response } from 'express';
import { db } from '../db';
import { verifyWebhookSignature } from '../services/razorpay';
import { fulfillOrder } from '../services/fulfillOrder';

const router = Router();

// Raw body is captured by express.raw() middleware mounted before this in index.ts
router.post('/razorpay', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) return res.status(400).json({ error: 'Missing signature' });

  const rawBody: Buffer = req.body;
  // HMAC over raw JSON body using RAZORPAY_WEBHOOK_SECRET — different from payment verification
  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event: { event: string; payload: { payment: { entity: Record<string, unknown> } } };
  try {
    event = JSON.parse(rawBody.toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Respond immediately — Razorpay retries if we take > 5 s
  res.status(200).json({ ok: true });

  setImmediate(async () => {
    try {
      await processWebhookEvent(event);
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  });
});

async function processWebhookEvent(event: {
  event: string;
  payload: { payment: { entity: Record<string, unknown> } };
}) {
  if (event.event !== 'payment.captured') return;

  const payment = event.payload.payment.entity;
  const razorpayOrderId = payment['order_id'] as string;
  const paymentId = payment['id'] as string;
  const amountPaise = payment['amount'] as number;

  if (!razorpayOrderId || !paymentId) {
    console.warn('Webhook missing order_id or payment_id');
    return;
  }

  const eventId = `${razorpayOrderId}_${paymentId}`;

  // Webhook-specific idempotency check — separate from fulfillOrder's own idempotency
  const existing = await db.query(
    'SELECT id FROM webhook_events WHERE razorpay_event_id = $1',
    [eventId]
  );
  if (existing.rows.length > 0) return; // already processed this exact webhook delivery

  // Resolve our internal order ID
  const orderResult = await db.query<{ id: string; amount_inr: number }>(
    'SELECT id, amount_inr FROM orders WHERE razorpay_order_id = $1',
    [razorpayOrderId]
  );
  if (orderResult.rows.length === 0) {
    console.warn('Webhook: order not found for razorpay_order_id (redacted)');
    return;
  }

  const order = orderResult.rows[0];

  // Guard against amount tampering
  if (order.amount_inr * 100 !== amountPaise) {
    console.error(`Webhook amount mismatch on order ${order.id}: rejecting`);
    return;
  }

  await fulfillOrder(order.id, paymentId);

  // Record delivery so we don't reprocess if Razorpay retries this webhook
  await db.query(
    'INSERT INTO webhook_events (razorpay_event_id, payload) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [eventId, JSON.stringify(event)]
  );
}

export default router;
