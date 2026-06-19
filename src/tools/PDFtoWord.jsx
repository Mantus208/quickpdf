import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export default function PDFtoWord({ onBack }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setDone(false);
    setError("");
    setLoadingThumbs(true);
    setThumbnails([]);

    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) })
      .promise;
    setPageCount(pdf.numPages);

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

  const convertToWord = async () => {
    if (!file) {
      alert("Please select a PDF file!");
      return;
    }
    setConverting(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/pdf-to-word`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Conversion failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const originalName = file.name.replace(".pdf", "");
      a.download = `${originalName}_by_PDFBabu.docx`;
      a.click();

      setDone(true);
    } catch {
      setError("❌ Conversion failed. Please try again.");
    }

    setConverting(false);
  };

  const reset = () => {
    setFile(null);
    setDone(false);
    setPageCount(0);
    setThumbnails([]);
    setError("");
  };

  return (
    <ToolLayout
      title="PDF to Word"
      icon="📝"
      onBack={onBack}
      actionBtn={
        file && (
          <div className="action-btn-group">
            <button
              className="action-btn"
              onClick={convertToWord}
              disabled={converting}
            >
              {converting ? (
                <>
                  <span className="btn-spinner"></span>
                  Converting...
                </>
              ) : (
                "📝 Convert to Word"
              )}
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
                <p className="sidebar-section-title">File Info</p>
                <p className="range-hint">📄 {file.name}</p>
                <p className="range-hint" style={{ marginTop: "0.4rem" }}>
                  {pageCount} pages · {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="sidebar-section">
                <p className="sidebar-section-title">What's Preserved</p>
                <div className="word-feature-list">
                  <div className="word-feature-item">✅ Text content</div>
                  <div className="word-feature-item">✅ Bold & Italic</div>
                  <div className="word-feature-item">✅ Font sizes</div>
                  <div className="word-feature-item">✅ Text colors</div>
                  <div className="word-feature-item">✅ Page breaks</div>
                  <div className="word-feature-item">
                    ⚠️ Images not included
                  </div>
                  <div className="word-feature-item">
                    ⚠️ Complex layouts may vary
                  </div>
                </div>
              </div>
              <div className="sidebar-section">
                <p className="sidebar-section-title">Compatibility</p>
                <div className="compat-notice">
                  <p className="compat-title">⚠️ Open with:</p>
                  <div className="compat-item compat-ok">
                    ✅ Word 2010 or later
                  </div>
                  <div className="compat-item compat-ok">
                    ✅ Google Docs (Free)
                  </div>
                  <div className="compat-item compat-ok">
                    ✅ LibreOffice (Free)
                  </div>
                  <div className="compat-item compat-no">
                    ❌ Word 2007 not supported
                  </div>
                </div>
              </div>
              {done && (
                <div className="sidebar-section">
                  <p className="success-msg">✅ Converted! .docx downloaded.</p>
                </div>
              )}

              {error && (
                <div className="sidebar-section">
                  <p className="error-msg">{error}</p>
                </div>
              )}
            </>
          )}

          {!file && (
            <div className="tool-tip">
              💡 Upload a PDF to convert it to an editable Word (.docx)
              document. Text formatting like bold, italic, and font sizes are
              preserved.
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
          id="pdf2word-input"
        />
        <label htmlFor="pdf2word-input" className="upload-label">
          📂 Select PDF File
        </label>
        <p className="upload-hint">Select one PDF file to convert to Word</p>
      </div>

      {file && (
        <div className="tool-file-list">
          <div className="tool-file-item">
            📄 {file.name} — {pageCount} pages — {(file.size / 1024).toFixed(1)}{" "}
            KB
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
            <div key={idx} className="page-thumb-card">
              <img src={thumb} alt={`Page ${idx + 1}`} />
              <span className="page-thumb-number">{idx + 1}</span>
            </div>
          ))}
        </div>
      )}

      {converting && (
        <div className="progress-box" style={{ marginTop: "1.5rem" }}>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: "80%", transition: "width 2s ease" }}
            ></div>
          </div>
          <p className="progress-text">
            Converting PDF to Word... This may take a moment.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}
