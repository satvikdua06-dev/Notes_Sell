import path from 'path';
import { pathToFileURL } from 'url';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

type PdfLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: {
    data: Uint8Array;
    standardFontDataUrl: string;
    isEvalSupported: boolean;
    disableFontFace: boolean;
  }) => { promise: Promise<PDFDocumentProxy> };
};

// Point Node.js to the bundled worker (uses worker_threads internally)
const workerPath = path.resolve(
  __dirname,
  '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
);
const fontsPath =
  pathToFileURL(
    path.resolve(__dirname, '../../node_modules/pdfjs-dist/standard_fonts/')
  ).toString() + '/';

(pdfjsLib as unknown as PdfLib).GlobalWorkerOptions.workerSrc =
  pathToFileURL(workerPath).toString();

const pdfjs = pdfjsLib as unknown as PdfLib;

export async function rasterizePage(pdfBuffer: Buffer, pageNum: number, dpi = 150): Promise<Buffer> {
  const scale = dpi / 72;

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    standardFontDataUrl: fontsPath,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  if (pageNum < 1 || pageNum > pdf.numPages) {
    throw new Error(`Page ${pageNum} out of range (1-${pdf.numPages})`);
  }

  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx as unknown as object, viewport }).promise;

  page.cleanup();
  pdf.cleanup();

  return canvas.toBuffer('image/jpeg', { quality: 0.88 });
}

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    standardFontDataUrl: fontsPath,
    isEvalSupported: false,
  }).promise;

  const count = pdf.numPages;
  pdf.cleanup();
  return count;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage(num: number): Promise<PDFPageProxy>;
  cleanup(): void;
}

interface PDFPageProxy {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: object; viewport: unknown }): { promise: Promise<void> };
  cleanup(): void;
}
