import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';

export const BUCKET_NAME = process.env.S3_BUCKET || 'notes-chapters';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  } catch (err: unknown) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound' || e.name === 'NoSuchBucket') {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`Created bucket: ${BUCKET_NAME}`);
    } else {
      throw err;
    }
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  if (!Body) throw new Error(`Object not found: ${key}`);
  const chunks: Buffer[] = [];
  for await (const chunk of Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function putObject(
  key: string,
  buffer: Buffer,
  contentType = 'application/octet-stream',
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}
