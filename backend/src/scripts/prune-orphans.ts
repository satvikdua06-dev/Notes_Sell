import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
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

async function listAll(): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }));
    for (const obj of res.Contents ?? []) if (obj.Key) keys.push(obj.Key);
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function prune() {
  const { rows } = await db.query<{ source_file_key: string }>('SELECT source_file_key FROM chapters');
  const referenced = new Set(rows.map(r => r.source_file_key));
  console.log(`Referenced by DB: ${referenced.size}`);

  const allKeys = await listAll();
  console.log(`In bucket:        ${allKeys.length}`);

  const orphans = allKeys.filter(k => !referenced.has(k));
  console.log(`Orphans to delete: ${orphans.length}`);
  if (orphans.length === 0) { await closePool(); return; }

  // DeleteObjects accepts max 1000 keys per call
  for (let i = 0; i < orphans.length; i += 1000) {
    const batch = orphans.slice(i, i + 1000).map(Key => ({ Key }));
    const res = await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: batch } }));
    if (res.Errors?.length) console.error('Delete errors:', res.Errors);
  }

  console.log(`Done. ${orphans.length} orphans deleted.`);
  await closePool();
}

prune().catch(err => { console.error(err); process.exit(1); });
