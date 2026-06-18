import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function SplitPDF({ onBack }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [excludedPages, setExcludedPages] = useState(new Set());
  const [splitType, setSplitType] = useState("all");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [splitting, setSplitting] = useState(false);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setDone(false);
    setExcludedPages(new Set());
    setLoadingThumbs(true);
    setThumbnails([]);

    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const count = pdf.getPageCount();
    setPageCount(count);
    setToPage(count);

    // Thumbnails generate karo
    const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) })
      .promise;
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

  const toggleExcludePage = (pageNum) => {
    setExcludedPages((prev) => {
      const updated = new Set(prev);
      if (updated.has(pageNum)) {
        updated.delete(pageNum);
      } else {
        updated.add(pageNum);
      }
      return updated;
    });
  };

  const splitPDF = async () => {
    if (!file) {
      alert("Please select a PDF file!");
      return;
    }
    setSplitting(true);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);

    if (splitType === "all") {
      const zip = new JSZip();
      for (let i = 0; i < pdf.getPageCount(); i++) {
        const pageNum = i + 1;
        if (excludedPages.has(pageNum)) continue;

        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(page);
        const bytes = await newPdf.save();
        zip.file(`page_${pageNum}.pdf`, bytes);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "split_pages.zip";
      a.click();
    } else {
      const from = Math.max(1, fromPage) - 1;
      const to = Math.min(pageCount, toPage) - 1;

      if (from > to) {
        alert("'From' page cannot be greater than 'To' page!");
        setSplitting(false);
        return;
      }

      const newPdf = await PDFDocument.create();
      const pageIndices = [];
      for (let i = from; i <= to; i++) {
        if (excludedPages.has(i + 1)) continue;
        pageIndices.push(i);
      }

      if (pageIndices.length === 0) {
        alert("All pages in this range are excluded!");
        setSplitting(false);
        return;
      }

      const pages = await newPdf.copyPages(pdf, pageIndices);
      pages.forEach((page) => newPdf.addPage(page));
      const bytes = await newPdf.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pages_${fromPage}_to_${toPage}.pdf`;
      a.click();
    }

    setSplitting(false);
    setDone(true);
  };

  const reset = () => {
    setFile(null);
    setDone(false);
    setPageCount(0);
    setThumbnails([]);
    setExcludedPages(new Set());
  };

  const includedCount = pageCount - excludedPages.size;

  return (
    <ToolLayout
      title="Split PDF"
      icon="✂️"
      onBack={onBack}
      actionBtn={
        file && (
          <button
            className="action-btn"
            onClick={splitPDF}
            disabled={splitting || !file || includedCount === 0}
          >
            {splitting
              ? "Splitting..."
              : `✂️ Split PDF (${includedCount} pages)`}
          </button>
        )
      }
      sidebar={
        <>
          {file && (
            <>
              <div className="sidebar-section">
                <p className="sidebar-section-title">Split Options</p>
                <div
                  className="option-row"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <label
                    className={`option-card ${splitType === "all" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="splitType"
                      value="all"
                      checked={splitType === "all"}
                      onChange={() => setSplitType("all")}
                    />
                    <span>📄 All Pages</span>
                    <small>Download as ZIP</small>
                  </label>
                  <label
                    className={`option-card ${splitType === "range" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="splitType"
                      value="range"
                      checked={splitType === "range"}
                      onChange={() => setSplitType("range")}
                    />
                    <span>📑 Range</span>
                    <small>Custom pages</small>
                  </label>
                </div>
              </div>

              {splitType === "range" && (
                <div className="sidebar-section">
                  <p className="sidebar-section-title">Page Range</p>
                  <div className="range-inputs">
                    <div className="range-field">
                      <label>From</label>
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={fromPage}
                        onChange={(e) => setFromPage(Number(e.target.value))}
                      />
                    </div>
                    <span className="range-dash">—</span>
                    <div className="range-field">
                      <label>To</label>
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={toPage}
                        onChange={(e) => setToPage(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <p className="range-hint">Total: {pageCount} pages</p>
                </div>
              )}

              {excludedPages.size > 0 && (
                <div className="sidebar-section">
                  <p className="sidebar-section-title">Excluded Pages</p>
                  <div className="excluded-pages-list">
                    {[...excludedPages]
                      .sort((a, b) => a - b)
                      .map((p) => (
                        <span key={p} className="excluded-tag">
                          Page {p}
                          <button onClick={() => toggleExcludePage(p)}>
                            ✕
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {done && (
                <div className="sidebar-section">
                  <p className="success-msg">✅ Done! Download started.</p>
                  <button
                    className="reset-btn"
                    onClick={reset}
                    style={{ marginTop: "0.8rem" }}
                  >
                    🔄 Split Another PDF
                  </button>
                </div>
              )}
            </>
          )}

          {!file && (
            <div className="tool-tip">
              💡 Select a PDF, then click the ✕ on any page thumbnail to exclude
              it from the split.
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
          id="split-input"
        />
        <label htmlFor="split-input" className="upload-label">
          📂 Select PDF File
        </label>
        <p className="upload-hint">Select one PDF file to split</p>
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
          {thumbnails.map((thumb, idx) => {
            const pageNum = idx + 1;
            const isExcluded = excludedPages.has(pageNum);
            return (
              <div
                key={idx}
                className={`page-thumb-card ${isExcluded ? "excluded" : ""}`}
              >
                <button
                  className="page-thumb-remove"
                  onClick={() => toggleExcludePage(pageNum)}
                  title={isExcluded ? "Include this page" : "Exclude this page"}
                >
                  {isExcluded ? "↺" : "✕"}
                </button>
                <img src={thumb} alt={`Page ${pageNum}`} />
                <span className="page-thumb-number">{pageNum}</span>
              </div>
            );
          })}
        </div>
      )}
    </ToolLayout>
  );
}
