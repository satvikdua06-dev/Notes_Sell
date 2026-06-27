import sharp from 'sharp';

interface WatermarkOptions {
  email: string;
  orderId: string;
  timestamp: string;
}

function buildWatermarkSvg(text: string, width: number, height: number): string {
  // Tile the watermark across the whole page — cannot be cropped out from any corner.
  // These are DETERRENTS baked into pixels; screenshots/photos of the screen cannot be
  // blocked by a website, but the tiled identity makes leaks traceable.
  let tiles = '';
  const rows = 7;
  const cols = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (width / cols) * c + 30;
      const y = (height / rows) * r + 50;
      tiles += `<text
        x="${x}" y="${y}"
        font-family="Arial, sans-serif"
        font-size="12"
        fill="rgba(100,100,100,0.25)"
        transform="rotate(-30 ${x} ${y})">${text}</text>`;
    }
  }
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="none"/>
    ${tiles}
  </svg>`;
}

export async function watermarkImage(
  imageBuffer: Buffer,
  options: WatermarkOptions
): Promise<Buffer> {
  const { width = 1240, height = 1754 } = await sharp(imageBuffer).metadata();
  const w = width ?? 1240;
  const h = height ?? 1754;

  const text = `${options.email} · ${options.orderId.slice(0, 8)} · ${options.timestamp}`;
  const svgOverlay = buildWatermarkSvg(text, w, h);

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}
