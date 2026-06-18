import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function CompressPDF({ onBack }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState("medium");
  const [compressing, setCompressing] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(0);
  const handleFile = (e) => {
    const selected = e.target.files[0];

    if (!selected) return;

    setFile(selected);

    const url = URL.createObjectURL(selected);

    setPreviewUrl(url);
    setDone(false);
    setStats(null);
    setProgress(0);
  };

  const qualitySettings = {
    low: { scale: 0.8, imgQuality: 0.4, label: "Max Compress" },
    medium: { scale: 1.2, imgQuality: 0.6, label: "Balanced" },
    high: { scale: 1.5, imgQuality: 0.85, label: "High Quality" },
  };

  const compressPDF = async () => {
    if (!file) {
      alert("Please select a PDF file!");
      return;
    }
    setCompressing(true);
    setProgress(0);

    const originalSize = file.size;
    const arrayBuffer = await file.arrayBuffer();

    let compressedBytes;

    if (quality === "high") {
      // Text PDF ke liye — metadata compression only
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        updateMetadata: false,
      });
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");
      pdfDoc.setCreator("");
      compressedBytes = await pdfDoc.save({ useObjectStreams: true });
      setProgress(100);
    } else {
      // Image-heavy PDF ke liye — canvas re-render
      const { scale, imgQuality } = qualitySettings[quality];
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const newPdf = await PDFDocument.create();
      const totalPages = pdfDoc.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = canvas.toDataURL("image/jpeg", imgQuality);
        const base64 = imgData.split(",")[1];
        const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const jpgImage = await newPdf.embedJpg(imgBytes);

        const a4W = 595;
        const a4H = 842;
        const scaleX = a4W / viewport.width;
        const scaleY = a4H / viewport.height;
        const fitScale = Math.min(scaleX, scaleY);

        const newPage = newPdf.addPage([a4W, a4H]);
        newPage.drawImage(jpgImage, {
          x: (a4W - viewport.width * fitScale) / 2,
          y: (a4H - viewport.height * fitScale) / 2,
          width: viewport.width * fitScale,
          height: viewport.height * fitScale,
        });

        setProgress(Math.round((i / totalPages) * 100));
      }
      compressedBytes = await newPdf.save();
    }

    const compressedSize = compressedBytes.length;
    const savedPercent = Math.max(
      0,
      Math.round(((originalSize - compressedSize) / originalSize) * 100),
    );

    setStats({
      original: (originalSize / 1024).toFixed(1),
      compressed: (compressedSize / 1024).toFixed(1),
      saved: savedPercent,
    });

    const blob = new Blob([compressedBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compressed.pdf";
    a.click();

    setCompressing(false);
    setDone(true);
  };

  return (
    <ToolLayout
      title="Compress PDF"
      icon="📦"
      onBack={onBack}
      actionBtn={
        file && (
          <>
            {done && (
              <button
                className="reset-btn"
                onClick={() => {
                  setFile(null);
                  setDone(false);
                  setStats(null);
                  setProgress(0);
                }}
              >
                🔄 Compress Another PDF
              </button>
            )}

            <button
              className="action-btn"
              onClick={compressPDF}
              disabled={compressing}
            >
              {compressing ? `Compressing ${progress}%...` : "📦 Compress PDF"}
            </button>
          </>
        )
      }
      sidebar={
        <>
          {file && (
            <>
              <div className="sidebar-section">
                <p className="sidebar-section-title">Compression Level</p>

                <div className="option-row">
                  {Object.entries(qualitySettings).map(([key, val]) => (
                    <label
                      key={key}
                      className={`option-card ${
                        quality === key ? "active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        checked={quality === key}
                        onChange={() => setQuality(key)}
                      />

                      <span className="option-icon">
                        {key === "low" ? "🗜️" : key === "medium" ? "⚖️" : "✨"}
                      </span>

                      <span className="option-title">{val.label}</span>

                      <small>
                        {key === "low"
                          ? "Maximum Size Reduction"
                          : key === "medium"
                            ? "Balanced Compression"
                            : "Best Quality"}
                      </small>
                    </label>
                  ))}
                </div>
              </div>

              {stats && (
                <div className="sidebar-section">
                  <p className="sidebar-section-title">Compression Result</p>

                  <div className="stats-box">
                    <div className="stat-row">
                      <span>Original</span>
                      <strong>{stats.original} KB</strong>
                    </div>

                    <div className="stat-row">
                      <span>Compressed</span>
                      <strong>{stats.compressed} KB</strong>
                    </div>

                    <div className="stat-row">
                      <span>Saved</span>
                      <strong>{stats.saved}%</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!file && (
            <div className="tool-tip">
              💡 Upload a PDF and choose compression level.
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
          id="compress-input"
        />

        <label htmlFor="compress-input" className="upload-label">
          📂 Select PDF File
        </label>

        <p className="upload-hint">Select one PDF file to compress</p>
      </div>
      {previewUrl && (
        <>
          <h3 className="preview-title">PDF Preview</h3>

          <div className="pdf-preview-card">
            <iframe src={previewUrl} title="PDF Preview" />
          </div>
        </>
      )}
      {file && (
        <div className="tool-file-list">
          <div className="tool-file-item">
            📄 {file.name}
            {" — "}
            {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      )}
      {compressing && (
        <div className="progress-box">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p className="progress-text">Compressing... {progress}%</p>
        </div>
      )}
    </ToolLayout>
  );
}
