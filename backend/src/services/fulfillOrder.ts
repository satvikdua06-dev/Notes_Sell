import { db } from '../db';

/**
 * Marks an order as paid and inserts purchase rows for every item.
 * Idempotent — if the order is already paid this is a safe no-op.
 * Uses SELECT … FOR UPDATE to prevent concurrent double-fulfillment.
 * Returns true if it actually did work, false if already fulfilled.
 */
export async function fulfillOrder(orderId: string, paymentId: string): Promise<boolean> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{ status: string; user_id: string }>(
      'SELECT status, user_id FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (rows.length === 0) throw new Error(`fulfillOrder: order not found: ${orderId}`);

    if (rows[0].status === 'paid') {
      await client.query('ROLLBACK');
      return false; // already fulfilled — idempotent no-op
    }

    const userId = rows[0].user_id;

    await client.query(
      "UPDATE orders SET status = 'paid' WHERE id = $1",
      [orderId]
    );

    const items = await client.query<{ chapter_id: string }>(
      'SELECT chapter_id FROM order_items WHERE order_id = $1',
      [orderId]
    );

    for (const item of items.rows) {
      await client.query(
        `INSERT INTO purchases (user_id, chapter_id, order_id, status)
         VALUES ($1, $2, $3, 'paid')
         ON CONFLICT (user_id, chapter_id) DO NOTHING`,
        [userId, item.chapter_id, orderId]
      );
    }

    await client.query('COMMIT');
    console.log(`Order fulfilled: orderId=${orderId}`); // payment_id kept in DB, not logs
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
