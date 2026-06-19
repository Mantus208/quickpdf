import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PDFtoJPG({ onBack }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertType, setConvertType] = useState("all");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);

  const handleFile = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setDone(false);
    setProgress(0);
    setLoadingThumbs(true);
    setThumbnails([]);

    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) })
      .promise;
    setPageCount(pdf.numPages);
    setToPage(pdf.numPages);

    const thumbs = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
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

  const convertToJPG = async () => {
    if (!file) {
      alert("Please select a PDF file!");
      return;
    }
    setConverting(true);
    setProgress(0);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const from = convertType === "all" ? 1 : Math.max(1, fromPage);
    const to =
      convertType === "all" ? pdf.numPages : Math.min(pageCount, toPage);

    const zip = new JSZip();

    for (let i = from; i <= to; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");

      await page.render({ canvasContext: ctx, viewport }).promise;

      const jpgData = canvas.toDataURL("image/jpeg", 0.92);
      const base64 = jpgData.split(",")[1];
      zip.file(`page_${i}.jpg`, base64, { base64: true });

      setProgress(Math.round(((i - from + 1) / (to - from + 1)) * 100));
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf_images.zip";
    a.click();

    setConverting(false);
    setDone(true);
  };

  const reset = () => {
    setFile(null);
    setDone(false);
    setPageCount(0);
    setProgress(0);
    setThumbnails([]);
  };

  return (
    <ToolLayout
      title="PDF to JPG"
      icon="🖼️"
      onBack={onBack}
      actionBtn={
        file && (
          <div className="action-btn-group">
            <button
              className="action-btn"
              onClick={convertToJPG}
              disabled={converting || !file}
            >
              {converting ? `Converting ${progress}%...` : "🖼️ Convert to JPG"}
            </button>
            {done && (
              <button className="reset-btn" onClick={reset}>
                🔄 Convert Another PDF
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
                <p className="sidebar-section-title">Convert Options</p>
                <div className="option-row">
                  <label
                    className={`option-card ${
                      convertType === "all" ? "active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="convertType"
                      value="all"
                      checked={convertType === "all"}
                      onChange={() => setConvertType("all")}
                    />
                    <span className="option-icon">🖼️</span>
                    <span className="option-title">All Pages</span>
                    <small>Convert all pages to JPG</small>
                  </label>
                  <label
                    className={`option-card ${
                      convertType === "range" ? "active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="convertType"
                      value="range"
                      checked={convertType === "range"}
                      onChange={() => setConvertType("range")}
                    />
                    <span className="option-icon">📑</span>
                    <span className="option-title">Custom Range</span>
                    <small>Convert specific pages only</small>
                  </label>
                </div>
              </div>

              {convertType === "range" && (
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
                  <p className="range-hint">Total pages: {pageCount}</p>
                </div>
              )}

              {done && (
                <div className="sidebar-section">
                  <p className="success-msg">
                    ✅ Converted! ZIP download started.
                  </p>
                </div>
              )}
            </>
          )}

          {!file && (
            <div className="tool-tip">
              💡 Select a PDF to convert its pages into high quality JPG images,
              downloaded as a ZIP file.
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
          id="pdf2jpg-input"
        />
        <label htmlFor="pdf2jpg-input" className="upload-label">
          📂 Select PDF File
        </label>
        <p className="upload-hint">Select one PDF file to convert</p>
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
            const inRange =
              convertType === "all" ||
              (pageNum >= fromPage && pageNum <= toPage);
            return (
              <div
                key={idx}
                className={`page-thumb-card ${!inRange ? "excluded" : ""}`}
              >
                <img src={thumb} alt={`Page ${pageNum}`} />
                <span className="page-thumb-number">{pageNum}</span>
              </div>
            );
          })}
        </div>
      )}

      {converting && (
        <div className="progress-box" style={{ marginTop: "1.5rem" }}>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">Converting... {progress}%</p>
        </div>
      )}
    </ToolLayout>
  );
}
