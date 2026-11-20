import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Exports the clean rendered CV DOM node into a crisp print-ready A4 PDF (supports 1 or multiple pages)
 * while preserving 100% accurate Bengali & English Unicode font shaping, layouts, photos, and signatures.
 */
export async function exportCvElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  // Ensure web fonts are loaded before rasterizing
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const pixelRatio = 2.5;
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

  const a4WidthMm = 210;
  const a4HeightMm = 297;

  // Map full image width to 210mm A4 width
  const pxPerMm = img.naturalWidth / a4WidthMm;
  const totalHeightMm = img.naturalHeight / pxPerMm;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [a4WidthMm, a4HeightMm],
    compress: true,
  });

  if (totalHeightMm <= a4HeightMm + 1.5) {
    // Fits cleanly on 1 A4 page
    const drawHeightMm = Math.min(a4HeightMm, totalHeightMm);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, a4WidthMm, drawHeightMm, undefined, 'FAST');
  } else {
    // Slice cleanly into exact A4 height pages without overlapping text
    const pageHeightPx = Math.floor(a4HeightMm * pxPerMm);
    const totalPages = Math.ceil(img.naturalHeight / pageHeightPx);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage([a4WidthMm, a4HeightMm], 'portrait');
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
        pdf.addImage(sliceDataUrl, 'JPEG', 0, 0, a4WidthMm, drawHeightMm, undefined, 'FAST');
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
