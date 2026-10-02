// Génère le PDF du dossier dans le navigateur, puis ajoute les PDF justificatifs en fin de document.
// Ce module est chargé à la demande (import dynamique) : il ne ralentit pas le démarrage de l'app.
import { pdf } from '@react-pdf/renderer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from '../db/db';
import { buildDossierData } from './data';
import { DossierDocument, pdfText } from './Dossier';

/** Convertit une image (PNG, JPEG, HEIC lisible, WebP…) en JPEG réduit, accepté par le moteur PDF. */
async function imageToJpegDataUrl(blob: Blob, maxSide = 1600): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null; // format illisible : l'annexe reste listée sans aperçu
  }
}

export async function buildDossierPdf(year: string): Promise<{ blob: Blob; warnings: string[] }> {
  const [tasks, categories, reviews, attachments, settings] = await Promise.all([
    db.tasks.toArray(), db.categories.toArray(), db.reviews.toArray(), db.attachments.toArray(), db.settings.get('settings'),
  ]);
  if (!settings) throw new Error('Réglages introuvables');
  const data = buildDossierData(year, tasks, categories, reviews, attachments, settings);
  const warnings: string[] = [];

  const images = new Map<string, string>();
  for (const a of data.annexes) {
    if (!a.attachment.mime.startsWith('image/')) continue;
    const url = await imageToJpegDataUrl(a.attachment.blob);
    if (url) images.set(a.attachment.id, url);
    else warnings.push(`Image illisible : ${a.attachment.name} (annexe ${a.code})`);
  }

  const mainBlob = await pdf(<DossierDocument d={data} images={images} />).toBlob();
  const pdfAnnexes = data.annexes.filter((a) => a.attachment.mime === 'application/pdf');
  if (!pdfAnnexes.length) return { blob: mainBlob, warnings };

  // Fusion : chaque page de PDF joint reçoit un bandeau « Annexe Ax ».
  const out = await PDFDocument.load(await mainBlob.arrayBuffer());
  const font = await out.embedFont(StandardFonts.HelveticaBold);
  for (const a of pdfAnnexes) {
    try {
      const src = await PDFDocument.load(await a.attachment.blob.arrayBuffer(), { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const p of pages) {
        out.addPage(p);
        const { height } = p.getSize();
        const label = pdfText(`Annexe ${a.code} · ${a.attachment.name}`).slice(0, 90);
        p.drawRectangle({ x: 0, y: height - 20, width: font.widthOfTextAtSize(label, 8) + 20, height: 20, color: rgb(0.18, 0.36, 0.31) });
        p.drawText(label, { x: 10, y: height - 14, size: 8, font, color: rgb(1, 1, 1) });
      }
    } catch {
      warnings.push(`PDF illisible ou protégé : ${a.attachment.name} (annexe ${a.code})`);
    }
  }
  const bytes = await out.save();
  return { blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), warnings };
}
