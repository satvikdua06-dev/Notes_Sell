import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '../services/redis';

const PAGE_FETCH_POINTS = parseInt(process.env.PAGE_FETCH_RATE_LIMIT || '60');
const PAGE_FETCH_DURATION = parseInt(process.env.PAGE_FETCH_RATE_WINDOW_SECONDS || '60');

const pageFetchLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_page',
  points: PAGE_FETCH_POINTS,
  duration: PAGE_FETCH_DURATION,
});

export async function pageRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.user?.id || req.ip || 'unknown';
  try {
    await pageFetchLimiter.consume(key);
    next();
  } catch (err) {
    // rate-limiter-flexible throws a RateLimiterRes (not an Error) on limit exceeded.
    // Actual Error instances mean Redis is unreachable — fail open rather than blocking users.
    if (err instanceof Error) {
      console.warn('[rateLimiter] Redis unavailable, skipping rate limit:', err.message);
      return next();
    }
    res.status(429).json({ error: 'Too many requests. Slow down.' });
  }
}
