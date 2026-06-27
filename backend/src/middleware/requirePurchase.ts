import { Request, Response, NextFunction } from 'express';
import { db } from '../db';

export async function requirePurchase(req: Request, res: Response, next: NextFunction) {
  const { chapterId } = req.params;
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const result = await db.query<{ order_id: string }>(
      `SELECT order_id FROM purchases
       WHERE user_id = $1 AND chapter_id = $2 AND status = 'paid'`,
      [req.user.id, chapterId]
    );
    if (result.rows.length === 0) {
      // Generic error — don't reveal whether chapter exists vs. not purchased
      return res.status(403).json({ error: 'Access denied' });
    }
    req.purchase = { orderId: result.rows[0].order_id };
    next();
  } catch (err) {
    console.error('requirePurchase error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
