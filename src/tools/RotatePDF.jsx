import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function RotatePDF({ onBack }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setDone(false);
    setLoadingThumbs(true);
    setThumbnails([]);

    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdfjsDoc = await pdfjsLib.getDocument({
      data: arrayBuffer.slice(0),
    }).promise;
    setPageCount(pdfjsDoc.numPages);
    setRotations(new Array(pdfjsDoc.numPages).fill(0));

    const thumbs = [];
    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      thumbs.push(canvas.toDataURL("image/jpeg", 0.7));
    }
    setThumbnails(thumbs);
    setLoadingThumbs(false);
  };

  const rotatePage = (index) => {
    setRotations((prev) => {
      const updated = [...prev];
      updated[index] = (updated[index] + 90) % 360;
      return updated;
    });
  };

  const rotateAllPages = () => {
    setRotations((prev) => prev.map((r) => (r + 90) % 360));
  };

  const resetRotations = () => {
    setRotations(new Array(pageCount).fill(0));
  };

  const applyRotation = async () => {
    if (!file) {
      alert("Please select a PDF file!");
      return;
    }
    const hasRotation = rotations.some((r) => r !== 0);
    if (!hasRotation) {
      alert("No rotation applied! Rotate at least one page first.");
      return;
    }

    setRotating(true);
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    pages.forEach((page, idx) => {
      if (rotations[idx]) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotations[idx]));
      }
    });

    const rotatedBytes = await pdfDoc.save();
    const blob = new Blob([rotatedBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const originalName = file.name.replace(".pdf", "");
    a.download = `${originalName}_Rotated_by_PDFBabu.pdf`;
    a.click();

    setRotating(false);
    setDone(true);
  };

  const reset = () => {
    setFile(null);
    setDone(false);
    setPageCount(0);
    setThumbnails([]);
    setRotations([]);
  };

  const rotatedCount = rotations.filter((r) => r !== 0).length;

  return (
    <ToolLayout
      title="Rotate PDF"
      icon="🔄"
      onBack={onBack}
      actionBtn={
        file && (
          <div className="action-btn-group">
            <button
              className="action-btn"
              onClick={applyRotation}
              disabled={rotating || rotatedCount === 0}
            >
              {rotating
                ? "Rotating..."
                : `🔄 Save Rotated PDF (${rotatedCount} pages)`}
            </button>
            {done && (
              <button className="reset-btn" onClick={reset}>
                🔄 Rotate Another PDF
              </button>
            )}
          </div>
        )
      }
      sidebar={
        <>
          {file && (
            <>
              <div className="sidebar-section">
                <p className="sidebar-section-title">Quick Actions</p>
                <button
                  className="tool-btn"
                  onClick={rotateAllPages}
                  style={{ marginBottom: "0.6rem" }}
                >
                  <span className="tool-icon">🔄</span>
                  Rotate All Pages 90°
                </button>
                <button
                  className="tool-btn danger"
                  onClick={resetRotations}
                  disabled={rotatedCount === 0}
                >
                  <span className="tool-icon">↺</span>
                  Reset All Rotations
                </button>
              </div>

              {rotatedCount > 0 && (
                <div className="sidebar-section">
                  <p className="sidebar-section-title">Rotation Summary</p>
                  <p className="range-hint">
                    {rotatedCount} of {pageCount} page
                    {pageCount > 1 ? "s" : ""} rotated
                  </p>
                </div>
              )}

              {done && (
                <div className="sidebar-section">
                  <p className="success-msg">✅ Done! Download started.</p>
                </div>
              )}
            </>
          )}

          {!file && (
            <div className="tool-tip">
              💡 Select a PDF, then click the rotate icon on any page thumbnail
              to rotate it 90° clockwise. Click multiple times to rotate
              further. Use "Rotate All Pages" to rotate everything at once.
            </div>
          )}
        </>
      }
    >
      <div className="tool-upload-area">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFile}
          id="rotate-input"
        />
        <label htmlFor="rotate-input" className="upload-label">
          📂 Select PDF File
        </label>
        <p className="upload-hint">Select one PDF file to rotate</p>
      </div>

      {file && (
        <div className="tool-file-list">
          <div className="tool-file-item">
            📄 {file.name} — {pageCount} pages
          </div>
        </div>
      )}

      {loadingThumbs && (
        <div className="progress-box">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "70%" }}></div>
          </div>
          <p className="progress-text">Generating page previews...</p>
        </div>
      )}

      {thumbnails.length > 0 && (
        <div className="page-thumb-grid">
          {thumbnails.map((thumb, idx) => (
            <div key={idx} className="page-thumb-card rotate-card">
              <button
                className="page-thumb-rotate"
                onClick={() => rotatePage(idx)}
                title="Rotate 90° clockwise"
              >
                🔄
              </button>
              <div className="rotate-thumb-wrap">
                <img
                  src={thumb}
                  alt={`Page ${idx + 1}`}
                  style={{
                    transform: `rotate(${rotations[idx]}deg)`,
                  }}
                />
              </div>
              <span className="page-thumb-number">
                {idx + 1}
                {rotations[idx] !== 0 && (
                  <span className="rotate-angle-badge">{rotations[idx]}°</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </ToolLayout>
  );
}
