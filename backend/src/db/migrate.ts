import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root before the pool tries to read DATABASE_URL
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // fallback if run from root

import fs from 'fs';
import { db, closePool } from './index';

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '001_initial.sql'),
    'utf-8'
  );
  const client = await db.getClient();
  try {
    await client.query(sql);
    console.log('Migration complete');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

migrate();
