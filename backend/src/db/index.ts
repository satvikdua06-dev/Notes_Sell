import { Pool, PoolClient } from 'pg';

// Pool is created lazily on first use so that dotenv has time to load DATABASE_URL
// before the connection is attempted, regardless of import order.
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is not set. Make sure .env is loaded before the first DB query.'
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL client error', err);
    });
  }
  return _pool;
}

export const db = {
  query: <T = unknown>(text: string, params?: unknown[]) =>
    getPool().query<T & Record<string, unknown>>(text, params),
  getClient: (): Promise<PoolClient> => getPool().connect(),
};

export async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

export default { getPool, closePool };
