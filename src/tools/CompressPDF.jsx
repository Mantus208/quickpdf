import { useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function CompressPDF() {
  const [file, setFile] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState(null);

  const handleFile = (e) => {
    setFile(e.target.files[0]);
    setDone(false);
    setStats(null);
  };

  const compressPDF = async () => {
    if (!file) {
      alert("Please select a PDF file!");
      return;
    }
    setCompressing(true);

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      updateMetadata: false,
    });

    // Remove metadata to reduce size
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("");
    pdfDoc.setCreator("");

    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    const originalSize = file.size;
    const compressedSize = compressedBytes.length;
    const savedPercent = Math.round(
      ((originalSize - compressedSize) / originalSize) * 100,
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
        Reduce your PDF file size while maintaining the best possible quality.
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

      {stats && (
        <div className="stats-box">
          <div className="stat">
            <span className="stat-label">Original Size</span>
            <span className="stat-value">{stats.original} KB</span>
          </div>
          <div className="stat">
            <span className="stat-label">Compressed Size</span>
            <span className="stat-value">{stats.compressed} KB</span>
          </div>
          <div className="stat">
            <span className="stat-label">Space Saved</span>
            <span className="stat-value saved">{stats.saved}%</span>
          </div>
        </div>
      )}

      <button
        className="action-btn"
        onClick={compressPDF}
        disabled={compressing || !file}
      >
        {compressing ? "Compressing..." : "📦 Compress PDF"}
      </button>

      {done && (
        <p className="success-msg">
          ✅ PDF compressed successfully! Download started.
        </p>
      )}
    </div>
  );
}
