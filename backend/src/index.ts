import dotenv from 'dotenv';
import path from 'path';
// .env is at project root (parent of backend/). Load it before any other imports touch env vars.
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // fallback
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { db } from './db';
import { ensureBucket } from './services/minio';
import { redis } from './services/redis';

import authRouter from './routes/auth';
import catalogRouter from './routes/catalog';
import ordersRouter from './routes/orders';
import webhooksRouter from './routes/webhooks';
import viewerRouter from './routes/viewer';
import libraryRouter from './routes/library';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Webhook route needs raw body for HMAC verification — mount BEFORE json middleware
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

// All other routes use JSON
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRouter);
app.use('/api', catalogRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/chapters', viewerRouter);
app.use('/api/library', libraryRouter);

// Health — actively pings Redis and Postgres so a single external cron hit
// keeps all three free-tier services (Render web, Render Redis, Supabase) from sleeping.
app.get('/health', async (_req, res) => {
  try {
    await redis.ping();
    await db.query('SELECT 1');
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error('[health] Check failed:', err);
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

async function start() {
  // Redis is optional for startup — rate limiting and token caching degrade
  // gracefully if it's unreachable. ioredis retries in the background.
  try {
    await redis.connect();
  } catch (err) {
    console.warn('[redis] Could not connect on startup — server will start anyway and retry in background:', (err as Error).message);
  }

  // S3 bucket is a hard dependency — fail fast if misconfigured.
  await ensureBucket();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
