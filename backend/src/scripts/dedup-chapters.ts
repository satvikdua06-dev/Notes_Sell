import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { db, closePool } from '../db';

const BUCKET = process.env.S3_BUCKET || 'chapters';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

async function dedup() {
  // Find every chapter that shares (subject_id, title) with another row.
  // Keep the oldest row (earliest created_at), delete the rest.
  const { rows: dupes } = await db.query<{ id: string; title: string; source_file_key: string }>(`
    WITH ranked AS (
      SELECT id, title, source_file_key,
             ROW_NUMBER() OVER (PARTITION BY subject_id, title ORDER BY created_at ASC) AS rn
      FROM chapters
    )
    SELECT id, title, source_file_key FROM ranked WHERE rn > 1
  `);

  console.log(`Duplicate chapter rows to remove: ${dupes.length}`);
  if (dupes.length === 0) {
    console.log('Nothing to do.');
    await closePool();
    return;
  }

  for (const d of dupes) {
    console.log(`  • ${d.title} (${d.id}) — key: ${d.source_file_key}`);
  }

  // Reassign any order_items / purchases pointing at a duplicate to the canonical row
  const { rows: canonicals } = await db.query<{ dup_id: string; keep_id: string }>(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY subject_id, title ORDER BY created_at ASC) AS rn,
             FIRST_VALUE(id) OVER (PARTITION BY subject_id, title ORDER BY created_at ASC) AS keep_id
      FROM chapters
    )
    SELECT id AS dup_id, keep_id FROM ranked WHERE rn > 1
  `);

  for (const { dup_id, keep_id } of canonicals) {
    await db.query(`UPDATE order_items SET chapter_id = $1 WHERE chapter_id = $2`, [keep_id, dup_id]);
    await db.query(`UPDATE purchases  SET chapter_id = $1 WHERE chapter_id = $2`, [keep_id, dup_id]);
  }
  console.log(`Reassigned references from ${canonicals.length} duplicate rows to their canonical rows.`);

  // Now safe to delete the duplicates
  const ids = dupes.map(d => d.id);
  await db.query(`DELETE FROM chapters WHERE id = ANY($1::uuid[])`, [ids]);
  console.log(`\nDeleted ${ids.length} duplicate DB rows.`);

  // Delete corresponding PDFs from Supabase
  const keys = dupes.map(d => d.source_file_key).filter(Boolean);
  if (keys.length) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: keys.map(Key => ({ Key })) },
    }));
    console.log(`Deleted ${keys.length} PDFs from Supabase bucket "${BUCKET}".`);
  }

  // Final counts
  const { rows: [{ count }] } = await db.query<{ count: string }>('SELECT COUNT(*) FROM chapters');
  console.log(`\nChapters remaining in DB: ${count}`);

  await closePool();
}

dedup().catch(err => { console.error(err); process.exit(1); });
