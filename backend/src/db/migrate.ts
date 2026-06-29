import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fs from 'fs';
import { db, closePool } from './index';

const MIGRATIONS = ['001_initial.sql', '002_admin.sql'];

async function migrate() {
  const client = await db.getClient();
  try {
    // Tracking table — idempotent
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const version of MIGRATIONS) {
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );
      if (rows.length > 0) {
        console.log(`  skip  ${version} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(
        path.join(__dirname, 'migrations', version),
        'utf-8'
      );
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      console.log(`  apply ${version}`);
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

migrate();
