import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { requirePurchase } from '../middleware/requirePurchase';
import { pageRateLimit } from '../middleware/rateLimiter';
import { getObjectBuffer } from '../services/minio';
import { rasterizePage } from '../services/pdfRasterizer';
import { watermarkImage } from '../services/watermark';
import { redis } from '../services/redis';

const router = Router();

function getViewerTTL() {
  return parseInt(process.env.VIEWER_SESSION_TTL_MINUTES || '10') * 60;
}
function getViewerSecret(): string {
  const s = process.env.VIEWER_SESSION_SECRET || process.env.JWT_SECRET || '';
  if (!s) throw new Error('VIEWER_SESSION_SECRET or JWT_SECRET must be set');
  return s;
}

// GET /api/chapters/:chapterId/viewer-session
// Returns a short-lived signed token the frontend uses for page fetches
router.get('/:chapterId/viewer-session', requireAuth, requirePurchase, async (req: Request, res: Response) => {
  const { chapterId } = req.params;
  try {
    const chap = await db.query<{ page_count: number }>(
      'SELECT page_count FROM chapters WHERE id = $1',
      [chapterId]
    );
    if (chap.rows.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const ttl = getViewerTTL();
    const token = jwt.sign(
      { userId: req.user!.id, email: req.user!.email, chapterId, orderId: req.purchase!.orderId },
      getViewerSecret(),
      { expiresIn: `${ttl}s` }
    );

    // Store token in Redis for server-side revocation. Non-fatal if Redis is down —
    // the JWT's own expiry is the security backstop.
    try {
      await redis.setex(`viewer:${req.user!.id}:${chapterId}`, ttl, token);
    } catch (redisErr) {
      console.warn('[viewer] Redis unavailable, token not cached (JWT still valid):', (redisErr as Error).message);
    }

    return res.json({ token, pageCount: chap.rows[0].page_count, expiresIn: ttl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chapters/:chapterId/page/:pageNum?token=...
// Returns a watermarked JPEG. Validates token (not full DB auth for speed),
// then checks cache, rasterizes if needed, watermarks, and streams.
router.get('/:chapterId/page/:pageNum', pageRateLimit, async (req: Request, res: Response) => {
  const { chapterId, pageNum } = req.params;
  const token = req.query.token as string;

  if (!token) {
    return res.status(401).json({ error: 'Viewer token required' });
  }

  let payload: { userId: string; email: string; chapterId: string; orderId: string };
  try {
    payload = jwt.verify(token, getViewerSecret()) as typeof payload;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired viewer token' });
  }

  if (payload.chapterId !== chapterId) {
    return res.status(403).json({ error: 'Token chapter mismatch' });
  }

  // Verify token is still in Redis (allows server-side revocation).
  // If Redis is unreachable, the JWT's own cryptographic expiry is the fallback.
  try {
    const stored = await redis.get(`viewer:${payload.userId}:${chapterId}`);
    // Only reject if Redis responded AND the stored token doesn't match.
    // stored === null means the key expired naturally — also reject (re-open a viewer session).
    if (stored !== token) {
      return res.status(401).json({ error: 'Session expired or revoked' });
    }
  } catch (redisErr) {
    console.warn('[viewer] Redis unavailable for session check, trusting JWT signature:', (redisErr as Error).message);
  }

  const page = parseInt(pageNum);
  if (isNaN(page) || page < 1) {
    return res.status(400).json({ error: 'Invalid page number' });
  }

  // Cache key is per-user so watermarks (which embed email+orderId) don't leak between users
  const cacheKey = `page:${payload.userId}:${chapterId}:${page}`;

  try {
    // Check Redis cache (TTL: 24h). Fall through to re-render if Redis is unavailable.
    let cached: Buffer | null = null;
    try {
      cached = await redis.getBuffer(cacheKey);
    } catch (redisErr) {
      console.warn('[viewer] Redis unavailable for cache lookup, re-rendering page:', (redisErr as Error).message);
    }
    if (cached) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached);
    }

    // Fetch chapter metadata
    const chap = await db.query<{ source_file_key: string; page_count: number }>(
      'SELECT source_file_key, page_count FROM chapters WHERE id = $1',
      [chapterId]
    );
    if (chap.rows.length === 0 || !chap.rows[0].source_file_key) {
      return res.status(404).json({ error: 'Chapter not found or no PDF uploaded' });
    }

    if (page > chap.rows[0].page_count) {
      return res.status(400).json({ error: 'Page number out of range' });
    }

    // Fetch PDF from private bucket (never exposed directly to clients)
    const pdfBuffer = await getObjectBuffer(chap.rows[0].source_file_key);

    // Rasterize the specific page to JPEG
    const rawPageImage = await rasterizePage(pdfBuffer, page);

    // Bake watermark into pixels server-side
    const watermarked = await watermarkImage(rawPageImage, {
      email: payload.email,
      orderId: payload.orderId,
      timestamp: new Date().toISOString().slice(0, 16),
    });

    // Cache for 24 hours (per-user; refresh daily via TTL). Non-fatal if Redis is down.
    try {
      await redis.setex(cacheKey, 86400, watermarked);
    } catch (redisErr) {
      console.warn('[viewer] Redis unavailable, page not cached:', (redisErr as Error).message);
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Cache', 'MISS');
    return res.send(watermarked);
  } catch (err) {
    console.error('Page fetch error:', err);
    return res.status(500).json({ error: 'Failed to render page' });
  }
});

// GET /api/chapters/:chapterId/info — authenticated, returns chapter info for purchased chapter
router.get('/:chapterId/info', requireAuth, requirePurchase, async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ id: string; title: string; page_count: number }>(
      `SELECT c.id, c.title, c.page_count
       FROM chapters c WHERE c.id = $1`,
      [req.params.chapterId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ chapter: result.rows[0] });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
