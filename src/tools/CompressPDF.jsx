import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function CompressPDF() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState("medium");
  const [compressing, setCompressing] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(0);

  const qualitySettings = {
    low: { scale: 0.8, imgQuality: 0.4, label: "Max Compress" },
    medium: { scale: 1.2, imgQuality: 0.6, label: "Balanced" },
    high: { scale: 1.5, imgQuality: 0.85, label: "High Quality" },
  };

  const handleFile = (e) => {
    setFile(e.target.files[0]);
    setDone(false);
    setStats(null);
    setProgress(0);
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
    <div className="tool-container">
      <h2>📦 Compress PDF</h2>
      <p className="tool-desc">
        Reduce PDF file size significantly while maintaining quality.
      </p>

      <div className="upload-box">
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

      {file && (
        <div className="file-list">
          <p>✅ File selected:</p>
          <div className="file-item">
            📄 {file.name} — {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      )}

      {/* Quality Options */}
      {file && (
        <div className="split-options">
          <p className="options-label">Compression Level:</p>
          <div
            className="option-row"
            style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
          >
            {Object.entries(qualitySettings).map(([key, val]) => (
              <label
                key={key}
                className={`option-card ${quality === key ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="quality"
                  value={key}
                  checked={quality === key}
                  onChange={() => setQuality(key)}
                />
                <span>
                  {key === "low" ? "🗜️" : key === "medium" ? "⚖️" : "✨"}{" "}
                  {val.label}
                </span>
                <small>
                  {key === "low"
                    ? "Image PDFs — max size reduction"
                    : key === "medium"
                      ? "Image PDFs — balanced quality"
                      : "All PDFs — lossless compression"}
                </small>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {compressing && (
        <div className="progress-box">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">Compressing... {progress}%</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="stats-box">
          <div className="stat">
            <span className="stat-label">Original</span>
            <span className="stat-value">{stats.original} KB</span>
          </div>
          <div className="stat">
            <span className="stat-label">Compressed</span>
            <span className="stat-value">{stats.compressed} KB</span>
          </div>
          <div className="stat">
            <span className="stat-label">Saved</span>
            <span className="stat-value saved">{stats.saved}%</span>
          </div>
        </div>
      )}

      <button
        className="action-btn"
        onClick={compressPDF}
        disabled={compressing || !file}
      >
        {compressing ? `Compressing ${progress}%...` : "📦 Compress PDF"}
      </button>

      {done && (
        <p className="success-msg">
          ✅ PDF compressed successfully! Download started.
        </p>
      )}
    </div>
  );
}
