import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { db } from '../db';
import { requireAdmin } from '../middleware/requireAuth';
import { putObject } from '../services/minio';
import { getPdfPageCount } from '../services/pdfRasterizer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(requireAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Centralised error wrapper — keeps each route body clean
type AsyncFn = (req: Request, res: Response) => Promise<unknown>;
function h(fn: AsyncFn) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[admin]', err);
      if (!res.headersSent) res.status(500).json({ error: 'Server error' });
    }
  };
}

// ─── AUTHORS ────────────────────────────────────────────────────────────────

router.get('/authors', h(async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, COUNT(c.id)::int AS chapter_count
    FROM authors a
    LEFT JOIN chapters c ON c.author_id = a.id
    GROUP BY a.id
    ORDER BY a.name
  `);
  res.json({ authors: rows });
}));

router.post('/authors', h(async (req, res) => {
  const { name, email, bio, payout_details } = req.body;
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'name and email required' });
  }
  const { rows } = await db.query(
    `INSERT INTO authors (name, email, bio, payout_details)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name.trim(), email.trim().toLowerCase(), bio || null,
     payout_details != null ? JSON.stringify(payout_details) : null]
  );
  res.status(201).json({ author: rows[0] });
}));

router.put('/authors/:id', h(async (req, res) => {
  const { name, email, bio, payout_details } = req.body;
  const { rows } = await db.query(
    `UPDATE authors SET name=$1, email=$2, bio=$3, payout_details=$4
     WHERE id=$5 RETURNING *`,
    [name?.trim(), email?.trim().toLowerCase(), bio || null,
     payout_details != null ? JSON.stringify(payout_details) : null,
     req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Author not found' });
  res.json({ author: rows[0] });
}));

router.delete('/authors/:id', h(async (req, res) => {
  const { rows: chaps } = await db.query(
    'SELECT id FROM chapters WHERE author_id = $1 LIMIT 1',
    [req.params.id]
  );
  if (chaps.length) {
    return res.status(409).json({
      error: 'Author has chapters assigned. Reassign or deactivate those chapters first.'
    });
  }
  const { rows } = await db.query('DELETE FROM authors WHERE id=$1 RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Author not found' });
  res.json({ ok: true });
}));

// ─── SUBJECTS ────────────────────────────────────────────────────────────────

router.get('/subjects', h(async (req, res) => {
  const { rows } = await db.query(`
    SELECT s.*,
           COUNT(c.id)::int AS chapter_count,
           COALESCE(SUM(c.price_inr), 0)::int AS chapters_sum_inr
    FROM subjects s
    LEFT JOIN chapters c ON c.subject_id = s.id
    GROUP BY s.id
    ORDER BY s.sort_order, s.name
  `);
  res.json({ subjects: rows });
}));

router.post('/subjects', h(async (req, res) => {
  const { name, slug, description, bundle_price_inr, sort_order } = req.body;
  if (!name?.trim() || !slug?.trim()) {
    return res.status(400).json({ error: 'name and slug required' });
  }
  const { rows } = await db.query(
    `INSERT INTO subjects (name, slug, description, bundle_price_inr, sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name.trim(), slug.trim(), description || null,
     parseInt(bundle_price_inr) || 0, parseInt(sort_order) || 0]
  );
  res.status(201).json({ subject: rows[0] });
}));

router.put('/subjects/:id', h(async (req, res) => {
  const { name, slug, description, bundle_price_inr, sort_order, is_active } = req.body;
  const { rows } = await db.query(
    `UPDATE subjects
     SET name=$1, slug=$2, description=$3, bundle_price_inr=$4, sort_order=$5, is_active=$6
     WHERE id=$7 RETURNING *`,
    [name?.trim(), slug?.trim(), description || null,
     parseInt(bundle_price_inr) || 0, parseInt(sort_order) || 0,
     is_active !== false && is_active !== 'false',
     req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Subject not found' });
  res.json({ subject: rows[0] });
}));

// Soft-delete: sets is_active = false
router.delete('/subjects/:id', h(async (req, res) => {
  const { rows } = await db.query(
    'UPDATE subjects SET is_active=false WHERE id=$1 RETURNING id',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Subject not found' });
  res.json({ ok: true, deactivated: true });
}));

// ─── CHAPTERS ────────────────────────────────────────────────────────────────

router.get('/chapters', h(async (req, res) => {
  const { rows } = await db.query(`
    SELECT c.*,
           s.name AS subject_name, s.slug AS subject_slug,
           a.name AS author_name
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN authors a ON a.id = c.author_id
    ORDER BY s.sort_order, s.name, c.sort_order, c.title
  `);
  res.json({ chapters: rows });
}));

router.post('/chapters', upload.single('pdf'), h(async (req, res) => {
  const { subject_id, title, price_inr, author_id, sort_order } = req.body;
  if (!subject_id || !title?.trim() || price_inr === undefined) {
    return res.status(400).json({ error: 'subject_id, title, price_inr required' });
  }

  let source_file_key: string | null = null;
  let page_count = 0;

  if (req.file) {
    source_file_key = `chapters/${subject_id}/${uuidv4()}.pdf`;
    await putObject(source_file_key, req.file.buffer, 'application/pdf');
    page_count = await getPdfPageCount(req.file.buffer);
  }

  const { rows } = await db.query(
    `INSERT INTO chapters (subject_id, title, price_inr, source_file_key, page_count, sort_order, author_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [subject_id, title.trim(), parseInt(price_inr), source_file_key, page_count,
     parseInt(sort_order) || 0, author_id || null]
  );
  res.status(201).json({ chapter: rows[0] });
}));

router.put('/chapters/:id', upload.single('pdf'), h(async (req, res) => {
  const { rows: ex } = await db.query('SELECT * FROM chapters WHERE id=$1', [req.params.id]);
  if (!ex.length) return res.status(404).json({ error: 'Chapter not found' });

  const cur = ex[0] as {
    title: string; price_inr: number; author_id: string | null;
    sort_order: number; is_active: boolean;
    source_file_key: string | null; page_count: number; subject_id: string;
  };

  let { source_file_key, page_count } = cur;
  if (req.file) {
    source_file_key = `chapters/${cur.subject_id}/${uuidv4()}.pdf`;
    await putObject(source_file_key, req.file.buffer, 'application/pdf');
    page_count = await getPdfPageCount(req.file.buffer);
  }

  const b = req.body;
  const isActive = b.is_active !== undefined
    ? b.is_active !== false && b.is_active !== 'false'
    : cur.is_active;

  const { rows } = await db.query(
    `UPDATE chapters
     SET title=$1, price_inr=$2, author_id=$3, sort_order=$4,
         is_active=$5, source_file_key=$6, page_count=$7
     WHERE id=$8 RETURNING *`,
    [
      b.title?.trim()  ?? cur.title,
      b.price_inr != null ? parseInt(b.price_inr) : cur.price_inr,
      b.author_id !== undefined ? (b.author_id || null) : cur.author_id,
      b.sort_order != null ? parseInt(b.sort_order) : cur.sort_order,
      isActive, source_file_key, page_count,
      req.params.id,
    ]
  );
  res.json({ chapter: rows[0] });
}));

// Soft-delete
router.delete('/chapters/:id', h(async (req, res) => {
  const { rows } = await db.query(
    'UPDATE chapters SET is_active=false WHERE id=$1 RETURNING id',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Chapter not found' });
  res.json({ ok: true, deactivated: true });
}));

// ─── BUNDLES  (per-subject bundle pricing) ──────────────────────────────────

router.get('/bundles', h(async (req, res) => {
  const { rows } = await db.query(`
    SELECT s.id, s.name, s.slug, s.is_active, s.bundle_price_inr, s.sort_order,
           COUNT(c.id)::int AS chapter_count,
           COALESCE(SUM(c.price_inr) FILTER (WHERE c.is_active = true), 0)::int AS active_sum_inr
    FROM subjects s
    LEFT JOIN chapters c ON c.subject_id = s.id
    GROUP BY s.id
    ORDER BY s.sort_order, s.name
  `);
  res.json({ bundles: rows });
}));

router.put('/bundles/:subjectId', h(async (req, res) => {
  const { bundle_price_inr, is_active } = req.body;
  if (bundle_price_inr === undefined && is_active === undefined) {
    return res.status(400).json({ error: 'bundle_price_inr or is_active required' });
  }
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;
  if (bundle_price_inr !== undefined) { sets.push(`bundle_price_inr=$${p++}`); vals.push(parseInt(bundle_price_inr)); }
  if (is_active !== undefined) { sets.push(`is_active=$${p++}`); vals.push(is_active !== false && is_active !== 'false'); }
  vals.push(req.params.subjectId);
  const { rows } = await db.query(
    `UPDATE subjects SET ${sets.join(', ')} WHERE id=$${p} RETURNING *`,
    vals
  );
  if (!rows.length) return res.status(404).json({ error: 'Subject not found' });
  res.json({ bundle: rows[0] });
}));

// ─── ORDERS ─────────────────────────────────────────────────────────────────

router.get('/orders', h(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = 25;
  const offset  = (page - 1) * perPage;

  const conds: string[] = [];
  const vals: unknown[] = [];
  let p = 1;

  if (req.query.status) { conds.push(`o.status = $${p++}`); vals.push(req.query.status); }
  if (req.query.email)  { conds.push(`u.email ILIKE $${p++}`); vals.push(`%${req.query.email}%`); }
  if (req.query.from)   { conds.push(`o.created_at >= $${p++}`); vals.push(req.query.from); }
  if (req.query.to)     { conds.push(`o.created_at <= $${p++}`); vals.push(req.query.to); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  vals.push(perPage, offset);

  const { rows } = await db.query(`
    SELECT o.id, o.amount_inr, o.status, o.created_at, o.razorpay_order_id,
           u.email AS user_email, u.name AS user_name,
           COALESCE(
             ARRAY_AGG(c.title ORDER BY c.title) FILTER (WHERE c.title IS NOT NULL),
             '{}'
           ) AS chapter_titles,
           COUNT(*) OVER()::int AS total_count
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN chapters c ON c.id = oi.chapter_id
    ${where}
    GROUP BY o.id, u.email, u.name
    ORDER BY o.created_at DESC
    LIMIT $${p++} OFFSET $${p++}
  `, vals);

  const total = Number(rows[0]?.total_count ?? 0);
  res.json({ orders: rows, total, page, pages: Math.ceil(total / perPage) });
}));

// ─── USERS ──────────────────────────────────────────────────────────────────

router.get('/users', h(async (req, res) => {
  const page    = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = 25;
  const offset  = (page - 1) * perPage;

  const conds: string[] = [];
  const vals: unknown[] = [];
  let p = 1;

  if (req.query.email) { conds.push(`u.email ILIKE $${p++}`); vals.push(`%${req.query.email}%`); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  vals.push(perPage, offset);

  const { rows } = await db.query(`
    SELECT u.id, u.email, u.name, u.role, u.created_at,
           (SELECT COUNT(*)::int    FROM purchases WHERE user_id = u.id) AS purchase_count,
           (SELECT COALESCE(SUM(amount_inr),0)::int FROM orders
            WHERE user_id = u.id AND status = 'paid') AS total_spend,
           COUNT(*) OVER()::int AS total_count
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT $${p++} OFFSET $${p++}
  `, vals);

  const total = Number(rows[0]?.total_count ?? 0);
  res.json({ users: rows, total, page, pages: Math.ceil(total / perPage) });
}));

// ─── STATS ──────────────────────────────────────────────────────────────────

router.get('/stats', h(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [rev, rev30, counts, topChapters, recentOrders, authorRevenue] = await Promise.all([

    db.query<{ total: number }>(
      "SELECT COALESCE(SUM(amount_inr),0)::int AS total FROM orders WHERE status='paid'"
    ),
    db.query<{ total: number }>(
      "SELECT COALESCE(SUM(amount_inr),0)::int AS total FROM orders WHERE status='paid' AND created_at >= $1",
      [thirtyDaysAgo]
    ),
    db.query<{ order_count: number; user_count: number }>(`
      SELECT
        (SELECT COUNT(*)::int          FROM orders    WHERE status='paid') AS order_count,
        (SELECT COUNT(DISTINCT user_id)::int FROM purchases)               AS user_count
    `),

    db.query(`
      SELECT c.id, c.title, s.name AS subject_name,
             COUNT(p.id)::int AS purchase_count
      FROM chapters c
      JOIN subjects s ON s.id = c.subject_id
      LEFT JOIN purchases p ON p.chapter_id = c.id
      GROUP BY c.id, s.name
      ORDER BY purchase_count DESC
      LIMIT 10
    `),

    db.query(`
      SELECT o.id, o.amount_inr, o.status, o.created_at,
             u.email AS user_email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 20
    `),

    // Revenue per author with proportional bundle attribution
    db.query(`
      WITH direct AS (
        SELECT oi.chapter_id, oi.price_at_purchase::numeric AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id AND o.status = 'paid'
        WHERE oi.price_at_purchase > 0
      ),
      bundle_items AS (
        SELECT oi.order_id, oi.chapter_id, c.price_inr::numeric AS standalone
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id AND o.status = 'paid'
        JOIN chapters c ON c.id = oi.chapter_id
        WHERE oi.price_at_purchase = 0
      ),
      order_pots AS (
        SELECT o.id AS order_id,
               o.amount_inr::numeric
               - COALESCE((
                   SELECT SUM(price_at_purchase) FROM order_items
                   WHERE order_id = o.id AND price_at_purchase > 0
                 ), 0) AS pot
        FROM orders o WHERE o.status = 'paid'
      ),
      bundle_denom AS (
        SELECT order_id, SUM(standalone) AS total_standalone
        FROM bundle_items GROUP BY order_id
      ),
      bundle_attributed AS (
        SELECT bi.chapter_id,
               CASE WHEN bd.total_standalone > 0
                 THEN op.pot * bi.standalone / bd.total_standalone
                 ELSE 0
               END AS revenue
        FROM bundle_items bi
        JOIN order_pots  op ON op.order_id = bi.order_id
        JOIN bundle_denom bd ON bd.order_id = bi.order_id
      ),
      all_revenue AS (
        SELECT chapter_id, revenue FROM direct
        UNION ALL
        SELECT chapter_id, revenue FROM bundle_attributed
      )
      SELECT COALESCE(a.name, 'Unattributed') AS author_name,
             a.id AS author_id,
             ROUND(SUM(ar.revenue))::int AS revenue
      FROM all_revenue ar
      JOIN chapters c ON c.id = ar.chapter_id
      LEFT JOIN authors a ON a.id = c.author_id
      GROUP BY a.id, a.name
      ORDER BY revenue DESC
    `),
  ]);

  res.json({
    revenue:           { all_time: rev.rows[0].total, last_30_days: rev30.rows[0].total },
    order_count:       counts.rows[0].order_count,
    active_user_count: counts.rows[0].user_count,
    revenue_by_author: authorRevenue.rows,
    top_chapters:      topChapters.rows,
    recent_orders:     recentOrders.rows,
  });
}));

export default router;
