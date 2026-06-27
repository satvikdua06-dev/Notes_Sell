import { Client } from 'minio';

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'notes-chapters';

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
});

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
    console.log(`Created MinIO bucket: ${BUCKET_NAME}`);
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const stream = await minioClient.getObject(BUCKET_NAME, key);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function putObject(key: string, buffer: Buffer, contentType = 'application/octet-stream') {
  await minioClient.putObject(BUCKET_NAME, key, buffer, buffer.length, { 'Content-Type': contentType });
}
