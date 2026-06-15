import { useEffect, useRef } from "react";
import { renderPdfPage } from "../utils/pdfRenderer";
import {
  initializeFabric,
  disposeFabric,
  getCanvasJSON,
  loadCanvasJSON,
} from "../utils/fabricEditor";

export default function PdfViewer({
  pdfDoc,
  currentPage,
  zoom,
  annotationsRef,
  onHistoryChange,
}) {
  const pdfCanvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const prevPageRef = useRef(currentPage);

  useEffect(() => {
    async function loadPage() {
      if (!pdfDoc) return;

      // Pehle current page ka kaam save karo
      const prevPage = prevPageRef.current;
      const json = getCanvasJSON();
      if (json) annotationsRef.current[prevPage] = json;

      const size = await renderPdfPage(
        pdfDoc,
        currentPage,
        pdfCanvasRef.current,
        zoom,
      );
      if (!size) return;

      initializeFabric(
        fabricCanvasRef.current,
        size.width,
        size.height,
        onHistoryChange,
      );

      // Naye page ke saved annotations load karo
      const savedJson = annotationsRef.current[currentPage];
      loadCanvasJSON(savedJson || null);

      prevPageRef.current = currentPage;
    }

    loadPage();

    return () => disposeFabric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, zoom]);

  return (
    <div className="canvas-wrapper">
      <canvas ref={pdfCanvasRef} id="pdf-canvas" />
      <canvas ref={fabricCanvasRef} className="fabric-canvas" />
    </div>
  );
}
