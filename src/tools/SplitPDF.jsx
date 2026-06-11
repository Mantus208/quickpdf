import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export default function SplitPDF() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [splitType, setSplitType] = useState("all");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [splitting, setSplitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setDone(false);
    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const count = pdf.getPageCount();
    setPageCount(count);
    setToPage(count);
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
      // ZIP mein sab pages
      const zip = new JSZip();
      for (let i = 0; i < pdf.getPageCount(); i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(page);
        const bytes = await newPdf.save();
        zip.file(`page_${i + 1}.pdf`, bytes);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "split_pages.zip";
      a.click();
    } else {
      // Range — single PDF download
      const from = Math.max(1, fromPage) - 1;
      const to = Math.min(pageCount, toPage) - 1;

      if (from > to) {
        alert("'From' page cannot be greater than 'To' page!");
        setSplitting(false);
        return;
      }

      const newPdf = await PDFDocument.create();
      const pageIndices = [];
      for (let i = from; i <= to; i++) pageIndices.push(i);
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

  return (
    <div className="tool-container">
      <h2>✂️ Split PDF</h2>
      <p className="tool-desc">
        Extract pages from your PDF — all pages in a ZIP or a custom range.
      </p>

      <div className="upload-box">
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
        <div className="file-list">
          <p>✅ File selected:</p>
          <div className="file-item">
            📄 {file.name} — {pageCount} pages
          </div>
        </div>
      )}

      {file && (
        <div className="split-options">
          <p className="options-label">Split Options:</p>

          <div className="option-row">
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
              <span>📄 Extract All Pages</span>
              <small>Download all pages as ZIP file</small>
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
              <span>📑 Custom Range</span>
              <small>Extract specific page range</small>
            </label>
          </div>

          {splitType === "range" && (
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

      <button
        className="action-btn"
        onClick={splitPDF}
        disabled={splitting || !file}
      >
        {splitting ? "Splitting..." : "✂️ Split PDF"}
      </button>

      {done && (
        <>
          <p className="success-msg">
            ✅ PDF split successfully! Download started.
          </p>
          <button
            className="reset-btn"
            onClick={() => {
              setFile(null);
              setDone(false);
              setPageCount(0);
            }}
          >
            🔄 Split Another PDF
          </button>
        </>
      )}
    </div>
  );
}
