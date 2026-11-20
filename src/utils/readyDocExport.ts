import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ReadyDocPaperSpec } from './readyDocs';

const waitForFonts = async () => {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {
    // ignore
  }
};

export const exportReadyDocToPdf = async (
  element: HTMLElement,
  paper: ReadyDocPaperSpec,
  filename: string
): Promise<void> => {
  await waitForFonts();

  const dataUrl = await toPng(element, {
    quality: 1,
    pixelRatio: 2.4,
    backgroundColor: '#ffffff',
    cacheBust: true,
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const pdf = new jsPDF({
    orientation: paper.orientation,
    unit: 'mm',
    format: [paper.widthMm, paper.heightMm],
    compress: true,
  });

  const pageWidthMm = paper.widthMm;
  const pageHeightMm = paper.heightMm;
  const renderedHeightMm = (img.height / img.width) * pageWidthMm;

  if (renderedHeightMm <= pageHeightMm + 2) {
    pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidthMm, Math.min(renderedHeightMm, pageHeightMm));
  } else {
    const pxPerMm = img.width / pageWidthMm;
    const pageSliceHeightPx = Math.floor(pageHeightMm * pxPerMm);
    const totalPages = Math.ceil(img.height / pageSliceHeightPx);

    for (let page = 0; page < totalPages; page++) {
      const sliceY = page * pageSliceHeightPx;
      const sliceH = Math.min(pageSliceHeightPx, img.height - sliceY);
      if (sliceH < 12) break;

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = img.width;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(img, 0, sliceY, img.width, sliceH, 0, 0, img.width, sliceH);

      if (page > 0) pdf.addPage([paper.widthMm, paper.heightMm], paper.orientation);
      const sliceHeightMm = sliceH / pxPerMm;
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidthMm, sliceHeightMm);
    }
  }

  pdf.save(filename);
};

export const exportReadyDocToImage = async (
  element: HTMLElement,
  format: 'png' | 'jpeg',
  filename: string
): Promise<void> => {
  await waitForFonts();

  const dataUrl =
    format === 'png'
      ? await toPng(element, {
          quality: 1,
          pixelRatio: 2.4,
          backgroundColor: '#ffffff',
          cacheBust: true,
        })
      : await toJpeg(element, {
          quality: 0.95,
          pixelRatio: 2.4,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
