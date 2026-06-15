export async function renderPdfPage(pdfDoc, pageNum, canvas, zoom) {
  if (!pdfDoc || !canvas) return null;

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: zoom });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  return { width: viewport.width, height: viewport.height };
}
