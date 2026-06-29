import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Fail individual commands quickly when Redis is unreachable rather than
  // queuing them indefinitely. Background reconnect still happens automatically.
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  // Log every error so it's visible in Render logs, but don't crash.
  console.warn('[redis] Connection error:', err.message);
});
redis.on('connect', () => console.log('[redis] Connected'));
redis.on('ready', () => console.log('[redis] Ready'));
redis.on('reconnecting', () => console.warn('[redis] Reconnecting…'));
