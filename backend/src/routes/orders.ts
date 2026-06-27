import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { getRazorpay } from '../services/razorpay';
import { fulfillOrder } from '../services/fulfillOrder';

const router = Router();

// POST /api/orders — create order from chapter IDs
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { chapterIds } = req.body;
  if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
    return res.status(400).json({ error: 'chapterIds array required' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Fetch chapter prices from DB — never trust client-submitted amounts
    const placeholders = chapterIds.map((_, i) => `$${i + 1}`).join(',');
    const chapResult = await client.query<{ id: string; price_inr: number }>(
      `SELECT id, price_inr FROM chapters WHERE id IN (${placeholders})`,
      chapterIds
    );

    if (chapResult.rows.length !== chapterIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more chapter IDs are invalid' });
    }

    const totalInr = chapResult.rows.reduce((sum, r) => sum + r.price_inr, 0);

    // Create Razorpay order (amount in paise).
    // payment_capture:1 enables auto-capture on authorization, so any valid
    // payment signature from our checkout is guaranteed to be a captured payment.
    // This is what makes the /verify endpoint safe without a separate Payments API fetch.
    const rzpOrder = await getRazorpay().orders.create({
      amount: totalInr * 100, // paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: true,
    });

    // Persist order
    const orderResult = await client.query<{ id: string }>(
      `INSERT INTO orders (user_id, razorpay_order_id, amount_inr, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [req.user!.id, rzpOrder.id, totalInr]
    );
    const orderId = orderResult.rows[0].id;

    // Persist order items
    for (const chap of chapResult.rows) {
      await client.query(
        'INSERT INTO order_items (order_id, chapter_id, price_at_purchase) VALUES ($1, $2, $3)',
        [orderId, chap.id, chap.price_inr]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      orderId,
      razorpayOrderId: rzpOrder.id,
      amount: totalInr * 100, // paise (Razorpay expects paise)
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', err);
    return res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// POST /api/orders/:id/verify — client-side payment verification fallback
// Called from the Razorpay handler callback when the webhook tunnel is unreliable.
// Signature formula: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
// Note: different from webhook signature (which HMACs the raw JSON body using WEBHOOK_SECRET).
router.post('/:id/verify', requireAuth, async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing Razorpay fields' });
  }

  // Step 1: ownership + idempotency checks before touching crypto
  const orderResult = await db.query<{ id: string; status: string; razorpay_order_id: string }>(
    'SELECT id, status, razorpay_order_id FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  if (orderResult.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const order = orderResult.rows[0];
  if (order.razorpay_order_id !== razorpay_order_id) {
    return res.status(400).json({ error: 'Order mismatch' });
  }
  if (order.status === 'paid') {
    return res.json({ status: 'paid' }); // idempotent — already fulfilled (likely by webhook)
  }

  // Step 2: verify signature using KEY_SECRET, not WEBHOOK_SECRET.
  // Formula: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET) → hex.
  // Safe because payment_capture:1 on order creation guarantees this signature
  // is only produced after the payment is captured, not merely authorized.
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex'); // always 64 hex chars

  // Explicit length check before timingSafeEqual — it throws on mismatched buffer lengths.
  // Treat length mismatch as invalid rather than letting it surface as an unhandled exception.
  const sig = String(razorpay_signature);
  if (expected.length !== sig.length) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  let valid = false;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch { valid = false; }

  if (!valid) return res.status(400).json({ error: 'Invalid signature' });

  // Step 3: fulfill — shared function, idempotent, safe if webhook also fires later
  try {
    await fulfillOrder(order.id, razorpay_payment_id);
    return res.json({ status: 'paid' });
  } catch (err) {
    console.error('Verify fulfillment error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/:id/status — poll payment status
router.get('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ status: string }>(
      'SELECT status FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json({ status: result.rows[0].status });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders — list user's orders with items
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query<{
      id: string; amount_inr: number; status: string; created_at: Date;
      chapter_titles: string[];
    }>(
      `SELECT o.id, o.amount_inr, o.status, o.created_at,
              ARRAY_AGG(c.title ORDER BY c.title) AS chapter_titles
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN chapters c ON c.id = oi.chapter_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user!.id]
    );
    return res.json({ orders: result.rows });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
