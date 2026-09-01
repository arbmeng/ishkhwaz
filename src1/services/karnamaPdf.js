import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// High-fidelity client-side exporter — screenshots the live template DOM
// (correctly shaped Kurdish/Arabic RTL text, real fonts) and lays it into a
// multi-page A4 PDF. Mirrors Karnama's own src/services/pdf.js exactly.
export const exportNodeToPdf = async (node, filename) => {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch {}
  }
  await new Promise((r) => setTimeout(r, 100));

  const dataUrl = await toPng(node, {
    pixelRatio: 2.5,
    backgroundColor: '#ffffff',
    cacheBust: true,
    filter: (domNode) => !(domNode.classList && domNode.classList.contains('no-print')),
  });

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const imgWidthMm = A4_WIDTH_MM;
  const pageHeightMm = A4_HEIGHT_MM;
  const imgHeightMm = (img.height * imgWidthMm) / img.width;

  let heightLeftMm = imgHeightMm;
  let positionMm = 0;

  pdf.addImage(dataUrl, 'PNG', 0, positionMm, imgWidthMm, imgHeightMm, undefined, 'FAST');
  heightLeftMm -= pageHeightMm;

  while (heightLeftMm > 2) {
    positionMm = heightLeftMm - imgHeightMm;
    pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', 0, positionMm, imgWidthMm, imgHeightMm, undefined, 'FAST');
    heightLeftMm -= pageHeightMm;
  }

  pdf.save(filename);
};

export const safeFilename = (name) =>
  (name || 'resume').trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
