import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const LOCAL_BUCKET = 'notes-chapters';
const REMOTE_BUCKET = process.env.S3_BUCKET || 'chapters';

const local = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
  forcePathStyle: true,
});

const remote = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

async function streamToBuffer(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function listAll(bucket: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await local.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const obj of res.Contents ?? []) if (obj.Key) keys.push(obj.Key);
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function migrate() {
  console.log(`Listing objects in local bucket "${LOCAL_BUCKET}"…`);
  const keys = await listAll(LOCAL_BUCKET);
  console.log(`Found ${keys.length} objects. Migrating to Supabase bucket "${REMOTE_BUCKET}"…\n`);

  let done = 0;
  let failed = 0;

  for (const key of keys) {
    try {
      const { Body } = await local.send(new GetObjectCommand({ Bucket: LOCAL_BUCKET, Key: key }));
      if (!Body) throw new Error('empty body');
      const buffer = await streamToBuffer(Body as AsyncIterable<Uint8Array>);

      await remote.send(new PutObjectCommand({
        Bucket: REMOTE_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
      }));

      done++;
      process.stdout.write(`\r  ✓ ${done}/${keys.length}  (${key.split('/').pop()})`);
    } catch (err) {
      failed++;
      console.error(`\n  ✗ FAILED: ${key} — ${(err as Error).message}`);
    }
  }

  console.log(`\n\nDone. ${done} uploaded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

migrate().catch((err) => { console.error(err); process.exit(1); });
