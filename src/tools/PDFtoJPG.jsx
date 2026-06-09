import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PDFtoJPG() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
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

    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setPageCount(pdf.numPages);
    setToPage(pdf.numPages);
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

  return (
    <div className="tool-container">
      <h2>🖼️ PDF to JPG</h2>
      <p className="tool-desc">
        Convert PDF pages to high quality JPG images. All images downloaded as
        ZIP.
      </p>

      <div className="upload-box">
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
        <div className="file-list">
          <p>✅ File selected:</p>
          <div className="file-item">
            📄 {file.name} — {pageCount} pages
          </div>
        </div>
      )}

      {file && (
        <div className="split-options">
          <p className="options-label">Convert Options:</p>
          <div className="option-row">
            <label
              className={`option-card ${convertType === "all" ? "active" : ""}`}
            >
              <input
                type="radio"
                name="convertType"
                value="all"
                checked={convertType === "all"}
                onChange={() => setConvertType("all")}
              />
              <span>🖼️ All Pages</span>
              <small>Convert all pages to JPG</small>
            </label>
            <label
              className={`option-card ${convertType === "range" ? "active" : ""}`}
            >
              <input
                type="radio"
                name="convertType"
                value="range"
                checked={convertType === "range"}
                onChange={() => setConvertType("range")}
              />
              <span>📑 Custom Range</span>
              <small>Convert specific pages only</small>
            </label>
          </div>

          {convertType === "range" && (
            <div className="range-inputs">
              <div className="range-field">
                <label>From Page</label>
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
                <label>To Page</label>
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={toPage}
                  onChange={(e) => setToPage(Number(e.target.value))}
                />
              </div>
              <p className="range-hint">Total pages: {pageCount}</p>
            </div>
          )}
        </div>
      )}

      {converting && (
        <div className="progress-box">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">Converting... {progress}%</p>
        </div>
      )}

      <button
        className="action-btn"
        onClick={convertToJPG}
        disabled={converting || !file}
      >
        {converting ? `Converting ${progress}%...` : "🖼️ Convert to JPG"}
      </button>

      {done && (
        <p className="success-msg">
          ✅ Converted successfully! ZIP download started.
        </p>
      )}
    </div>
  );
}
