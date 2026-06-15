import { useState, useRef } from "react";

export default function usePdfEditor() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  // { [pageNumber]: fabricJSON_string }
  const annotationsRef = useRef({});

  const zoomIn = () =>
    setZoom((z) => Math.min(Number((z + 0.1).toFixed(2)), 3));
  const zoomOut = () =>
    setZoom((z) => Math.max(Number((z - 0.1).toFixed(2)), 0.3));

  const reset = () => {
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);
    setZoom(1);
    annotationsRef.current = {};
  };

  return {
    pdfDoc,
    setPdfDoc,
    numPages,
    setNumPages,
    currentPage,
    setCurrentPage,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    annotationsRef,
    reset,
  };
}
