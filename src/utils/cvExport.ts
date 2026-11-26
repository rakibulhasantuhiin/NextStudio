import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Exports the clean rendered CV DOM node into a crisp print-ready A4 PDF (supports 1 or multiple pages)
 * while preserving 100% accurate Bengali & English Unicode font shaping, layouts, photos, and signatures.
 */
export async function exportCvElementToPdf(
  element: HTMLElement,
  filename: string,
  paperDims?: { widthMm: number; heightMm: number }
): Promise<void> {
  // Ensure web fonts are loaded before rasterizing
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const pageWidthMm = paperDims?.widthMm || 210;
  const pageHeightMm = paperDims?.heightMm || 297;
  const orientation: 'portrait' | 'landscape' =
    pageWidthMm > pageHeightMm ? 'landscape' : 'portrait';
  const pixelRatio = 2.5;

  const pageNodes = Array.from(element.querySelectorAll('.cv-print-page')) as HTMLElement[];

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm],
    compress: true,
  });

  if (pageNodes.length > 0) {
    for (let i = 0; i < pageNodes.length; i++) {
      const node = pageNodes[i];
      if (i > 0) {
        pdf.addPage([pageWidthMm, pageHeightMm], orientation);
      }

      const dataUrl = await toJpeg(node, {
        quality: 0.96,
        pixelRatio,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });

      const pxPerMm = img.naturalWidth / pageWidthMm;
      const renderedHeightMm = img.naturalHeight / pxPerMm;
      const drawHeightMm = Math.min(pageHeightMm, renderedHeightMm);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidthMm, drawHeightMm, undefined, 'FAST');
    }

    pdf.save(filename);
    return;
  }

  const dataUrl = await toJpeg(element, {
    quality: 0.96,
    pixelRatio,
    backgroundColor: '#ffffff',
    cacheBust: true,
  });

  // Load rendered image to measure exact pixel dimensions
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  // Map full image width to selected paper width
  const pxPerMm = img.naturalWidth / pageWidthMm;
  const totalHeightMm = img.naturalHeight / pxPerMm;

  if (totalHeightMm <= pageHeightMm + 1.5) {
    const drawHeightMm = Math.min(pageHeightMm, totalHeightMm);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidthMm, drawHeightMm, undefined, 'FAST');
  } else {
    const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);
    const totalPages = Math.ceil(img.naturalHeight / pageHeightPx);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage([pageWidthMm, pageHeightMm], orientation);
      }
      const sliceY = pageIndex * pageHeightPx;
      const sliceH = Math.min(pageHeightPx, img.naturalHeight - sliceY);

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = img.naturalWidth;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(img, 0, sliceY, img.naturalWidth, sliceH, 0, 0, img.naturalWidth, sliceH);
        const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.96);
        const drawHeightMm = sliceH / pxPerMm;
        pdf.addImage(sliceDataUrl, 'JPEG', 0, 0, pageWidthMm, drawHeightMm, undefined, 'FAST');
      }
    }
  }

  pdf.save(filename);
}

/**
 * Exports the clean rendered CV DOM node as high-resolution PNG or JPG image.
 */
export async function exportCvElementToImage(
  element: HTMLElement,
  format: 'png' | 'jpeg',
  filename: string
): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const dataUrl =
    format === 'png'
      ? await toPng(element, {
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
        })
      : await toJpeg(element, {
          quality: 0.96,
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
