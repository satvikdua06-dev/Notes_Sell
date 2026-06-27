import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../db';
import { requireAdmin } from '../middleware/requireAuth';
import { putObject, getObjectBuffer } from '../services/minio';
import { getPdfPageCount } from '../services/pdfRasterizer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Public: list all subjects with chapter counts
router.get('/subjects', async (_req: Request, res: Response) => {
  try {
    const result = await db.query<{
      id: string; name: string; slug: string; description: string;
      bundle_price_inr: number; chapter_count: string;
    }>(
      `SELECT s.id, s.name, s.slug, s.description, s.bundle_price_inr,
              COUNT(c.id)::text AS chapter_count
       FROM subjects s
       LEFT JOIN chapters c ON c.subject_id = s.id
       GROUP BY s.id
       ORDER BY s.sort_order, s.name`
    );
    return res.json({ subjects: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Public: chapters for a subject (no source_file_key exposed)
router.get('/subjects/:slug/chapters', async (req: Request, res: Response) => {
  try {
    const result = await db.query<{
      id: string; title: string; price_inr: number; page_count: number; sort_order: number;
    }>(
      `SELECT c.id, c.title, c.price_inr, c.page_count, c.sort_order
       FROM chapters c
       JOIN subjects s ON s.id = c.subject_id
       WHERE s.slug = $1
       ORDER BY c.sort_order, c.title`,
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      const subj = await db.query('SELECT id FROM subjects WHERE slug = $1', [req.params.slug]);
      if (subj.rows.length === 0) return res.status(404).json({ error: 'Subject not found' });
    }
    return res.json({ chapters: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Admin: upload a chapter PDF
router.post(
  '/subjects/:subjectId/chapters',
  requireAdmin,
  upload.single('pdf'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });
    const { title, price_inr, sort_order } = req.body;
    if (!title || !price_inr) return res.status(400).json({ error: 'title and price_inr required' });

    try {
      const fileKey = `chapters/${req.params.subjectId}/${uuidv4()}.pdf`;
      await putObject(fileKey, req.file.buffer, 'application/pdf');
      const pageCount = await getPdfPageCount(req.file.buffer);

      const result = await db.query<{ id: string }>(
        `INSERT INTO chapters (subject_id, title, price_inr, source_file_key, page_count, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.params.subjectId, title, parseInt(price_inr), fileKey, pageCount, parseInt(sort_order || '0')]
      );
      return res.status(201).json({ chapterId: result.rows[0].id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// Admin: update chapter source PDF
router.put(
  '/chapters/:chapterId/pdf',
  requireAdmin,
  upload.single('pdf'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });
    try {
      const existing = await db.query<{ source_file_key: string; subject_id: string }>(
        'SELECT source_file_key, subject_id FROM chapters WHERE id = $1',
        [req.params.chapterId]
      );
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Chapter not found' });

      const fileKey = `chapters/${existing.rows[0].subject_id}/${uuidv4()}.pdf`;
      await putObject(fileKey, req.file.buffer, 'application/pdf');
      const pageCount = await getPdfPageCount(req.file.buffer);

      await db.query(
        'UPDATE chapters SET source_file_key = $1, page_count = $2 WHERE id = $3',
        [fileKey, pageCount, req.params.chapterId]
      );
      return res.json({ ok: true, pageCount });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
