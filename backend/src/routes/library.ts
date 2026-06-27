import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// GET /api/library — all chapters the user has purchased
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query<{
      chapter_id: string; title: string; page_count: number;
      subject_name: string; subject_slug: string; purchased_at: Date;
    }>(
      `SELECT p.chapter_id, c.title, c.page_count,
              s.name AS subject_name, s.slug AS subject_slug,
              p.purchased_at
       FROM purchases p
       JOIN chapters c ON c.id = p.chapter_id
       JOIN subjects s ON s.id = c.subject_id
       WHERE p.user_id = $1 AND p.status = 'paid'
       ORDER BY p.purchased_at DESC`,
      [req.user!.id]
    );
    return res.json({ purchases: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
