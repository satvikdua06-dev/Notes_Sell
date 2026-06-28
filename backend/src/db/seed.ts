import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db, closePool } from './index';
import { ensureBucket, putObject, BUCKET_NAME } from '../services/minio';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const SUBJECTS = [
  {
    name: 'Biology',
    slug: 'biology',
    description: 'Complete chapter-wise biology notes for NEET preparation',
    bundle_price_inr: 49,
    price_inr: 12,
    chapters: [
      'Animal Kingdom',
      'Biotechnology Principles and Processes',
      'Biotechnology and its Applications',
      'Cockroach Short Notes',
      'Ecosystem',
      'Frog Short Notes',
      'Genetic Disorders Short Notes',
      'Human Health and Diseases',
      'Molecular Basis of Inheritance',
      'Morphology of Flowering Plants Short Notes',
      'Organism and Population',
      'Photosynthesis Complete Notes with Flowchart',
      'Plant Growth and Regulators Complete Notes',
      'Respiration in Plants Full Notes',
      'Sewage Treatment',
      'Single Cell Proteins',
      'Structural Organisation in Animals',
    ],
  },
  {
    name: 'Chemistry',
    slug: 'chemistry',
    description: 'Chemistry formula sheets and notes for JEE/NEET',
    bundle_price_inr: 6,
    price_inr: 2,
    chapters: [
      'Basics of Chemistry',
      'Chemical Equilibrium',
      'Electrochemistry',
      'Solutions',
      'Thermodynamics and Kinetic Theory of Gases',
    ],
  },
  {
    name: 'Physics',
    slug: 'physics',
    description: 'Physics formula sheets with derivations for JEE/NEET',
    bundle_price_inr: 12,
    price_inr: 2,
    chapters: [
      'Alternating Current',
      'Atoms and Modern Physics',
      'Current Electricity',
      'Elasticity and Fluid Dynamics',
      'Electrostatics Formula with Derivations',
      'Electromagnetic Induction',
      'Kinematics',
      'Moving Charges and Magnetism',
      'Electric Potential, Capacitance and AC (18 pages)',
      'Ray Optics',
      'Rotational Motion and Gravity',
      'Vectors',
      'Wave Optics',
    ],
  },
];

async function generatePlaceholderPdf(title: string, pages = 3): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([595, 842]);
    const { width, height } = page.getSize();

    page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0.48, 0.23, 0.93) });
    page.drawText('StudyNotes', { x: 20, y: height - 40, size: 20, font: boldFont, color: rgb(1, 1, 1) });
    page.drawText(`Page ${p + 1} of ${pages}`, { x: width - 90, y: height - 40, size: 12, font, color: rgb(1, 1, 1) });
    page.drawText(title, { x: 40, y: height - 100, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.1), maxWidth: width - 80 });

    const lines = [
      'Key Concepts:',
      '• Definition and introduction to the topic',
      '• Important formulas and equations',
      '• Diagrams and flowcharts',
      '• Previous year questions covered',
      '',
      'Notes Content:',
      'This is placeholder content. Upload your actual PDF via the admin panel.',
    ];
    lines.forEach((line, i) => {
      page.drawText(line, { x: 40, y: height - 150 - i * 22, size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2), maxWidth: width - 80 });
    });

    page.drawLine({ start: { x: 40, y: 40 }, end: { x: width - 40, y: 40 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    page.drawText('© StudyNotes — For personal use only', { x: 40, y: 20, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  }

  return Buffer.from(await doc.save());
}

async function seed() {
  console.log('Seeding database...');

  await ensureBucket();

  const client = await db.getClient();
  try {
    for (const subject of SUBJECTS) {
      const subjectResult = await client.query<{ id: string }>(
        `INSERT INTO subjects (name, slug, description, bundle_price_inr)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, bundle_price_inr=EXCLUDED.bundle_price_inr
         RETURNING id`,
        [subject.name, subject.slug, subject.description, subject.bundle_price_inr]
      );
      const subjectId = subjectResult.rows[0].id;
      console.log(`Seeded subject: ${subject.name}`);

      for (let i = 0; i < subject.chapters.length; i++) {
        const title = subject.chapters[i];
        const fileKey = `chapters/${subject.slug}/${uuidv4()}.pdf`;

        const pdfBuffer = await generatePlaceholderPdf(title, 3 + Math.floor(Math.random() * 4));
        await putObject(fileKey, pdfBuffer, 'application/pdf');

        await client.query(
          `INSERT INTO chapters (subject_id, title, price_inr, source_file_key, page_count, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [subjectId, title, subject.price_inr, fileKey, 3, i]
        );
        console.log(`  → ${title}`);
      }
    }

    const adminHash = await bcrypt.hash('admin123', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ('admin@studynotes.in', $1, 'Admin', 'admin') ON CONFLICT (email) DO NOTHING`,
      [adminHash]
    );

    const reviewHash = await bcrypt.hash('review123', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ('reviewer@studynotes.in', $1, 'Reviewer', 'user') ON CONFLICT (email) DO NOTHING`,
      [reviewHash]
    );

    console.log('\nSeed complete!');
    console.log('Admin:    admin@studynotes.in    / admin123');
    console.log('Reviewer: reviewer@studynotes.in / review123');
  } finally {
    client.release();
    await closePool();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
