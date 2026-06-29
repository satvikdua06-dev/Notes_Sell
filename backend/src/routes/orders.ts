import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { getRazorpay } from '../services/razorpay';
import { fulfillOrder } from '../services/fulfillOrder';

const router = Router();

// POST /api/orders — create order from individual chapters, subject bundles, or the mega-bundle.
// Bundle price comes from subjects.bundle_price_inr, never from summing chapters.
// Mega-bundle price comes from MEGA_BUNDLE_PRICE_INR env var (all subjects together).
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const chapterIds: string[] = Array.isArray(req.body.chapterIds) ? req.body.chapterIds : [];
  const bundleSubjectIds: string[] = Array.isArray(req.body.bundleSubjectIds) ? req.body.bundleSubjectIds : [];
  const megaBundle: boolean = req.body.megaBundle === true;

  if (!megaBundle && chapterIds.length === 0 && bundleSubjectIds.length === 0) {
    return res.status(400).json({ error: 'chapterIds, bundleSubjectIds, or megaBundle required' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Accumulate order items: chapterId → priceAtPurchase.
    // Bundle chapters record ₹0 so the order total stays correct (bundle price is in totalInr).
    const itemMap = new Map<string, number>();
    let totalInr = 0;

    // 1. Individual chapters — price from chapters.price_inr
    if (chapterIds.length > 0) {
      const placeholders = chapterIds.map((_, i) => `$${i + 1}`).join(',');
      const chapResult = await client.query<{ id: string; price_inr: number }>(
        `SELECT id, price_inr FROM chapters WHERE id IN (${placeholders})`,
        chapterIds
      );
      if (chapResult.rows.length !== chapterIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'One or more chapter IDs are invalid' });
      }
      for (const row of chapResult.rows) {
        itemMap.set(row.id, row.price_inr);
        totalInr += row.price_inr;
      }
    }

    // 2a. Mega-bundle — all subjects at fixed MEGA_BUNDLE_PRICE_INR
    if (megaBundle) {
      const megaPrice = parseInt(process.env.MEGA_BUNDLE_PRICE_INR || '59');
      totalInr += megaPrice;
      const allChaps = await client.query<{ id: string }>(
        'SELECT id FROM chapters WHERE is_active = true'
      );
      for (const row of allChaps.rows) {
        if (!itemMap.has(row.id)) itemMap.set(row.id, 0);
      }
    }

    // 2b. Bundle subjects — price from subjects.bundle_price_inr, expand to all chapters
    for (const subjectId of bundleSubjectIds) {
      const subjResult = await client.query<{ bundle_price_inr: number }>(
        'SELECT bundle_price_inr FROM subjects WHERE id = $1',
        [subjectId]
      );
      if (subjResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Bundle subject not found' });
      }
      totalInr += subjResult.rows[0].bundle_price_inr;

      const chapResult = await client.query<{ id: string }>(
        'SELECT id FROM chapters WHERE subject_id = $1 AND is_active = true',
        [subjectId]
      );
      for (const row of chapResult.rows) {
        // Don't overwrite a chapter already priced individually
        if (!itemMap.has(row.id)) itemMap.set(row.id, 0);
      }
    }

    // Create Razorpay order (amount in paise).
    // payment_capture:true enables auto-capture so /verify is safe without a Payments API fetch.
    const rzpOrder = await getRazorpay().orders.create({
      amount: totalInr * 100,
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
    for (const [chapId, price] of itemMap) {
      await client.query(
        'INSERT INTO order_items (order_id, chapter_id, price_at_purchase) VALUES ($1, $2, $3)',
        [orderId, chapId, price]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      orderId,
      razorpayOrderId: rzpOrder.id,
      amount: totalInr * 100,
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
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const sig = String(razorpay_signature);
  if (expected.length !== sig.length) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  let valid = false;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch { valid = false; }

  if (!valid) return res.status(400).json({ error: 'Invalid signature' });

  // Step 3: fulfill — idempotent, safe if webhook also fires later
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
