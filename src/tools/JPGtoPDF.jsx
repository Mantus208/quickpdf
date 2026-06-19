import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "../components/ToolLayout";

export default function JPGtoPDF({ onBack }) {
  const [files, setFiles] = useState([]);
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFiles = (e) => {
    const selected = [...e.target.files];
    setFiles((prev) => [...prev, ...selected]);
    setDone(false);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const convertToPDF = async () => {
    if (files.length === 0) {
      alert("Please select at least one image!");
      return;
    }
    setConverting(true);

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const mimeType = file.type;

      let image;
      if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } else if (mimeType === "image/png") {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else {
        continue;
      }

      const { width, height } = image.scale(1);

      const a4Width = 595;
      const a4Height = 842;

      const scaleX = a4Width / width;
      const scaleY = a4Height / height;
      const scale = Math.min(scaleX, scaleY, 1);

      const scaledWidth = width * scale;
      const scaledHeight = height * scale;

      const page = pdfDoc.addPage([a4Width, a4Height]);

      const x = (a4Width - scaledWidth) / 2;
      const y = (a4Height - scaledHeight) / 2;

      page.drawImage(image, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.pdf";
    a.click();

    setConverting(false);
    setDone(true);
  };

  const reset = () => {
    setFiles([]);
    setDone(false);
  };

  const getPreviewUrl = (file) => URL.createObjectURL(file);

  return (
    <ToolLayout
      title="JPG to PDF"
      icon="📄"
      onBack={onBack}
      actionBtn={
        files.length > 0 && (
          <div className="action-btn-group">
            <button
              className="action-btn"
              onClick={convertToPDF}
              disabled={converting || files.length === 0}
            >
              {converting
                ? "Converting..."
                : `📄 Convert to PDF (${files.length})`}
            </button>
            {done && (
              <button className="reset-btn" onClick={reset}>
                🔄 Convert More Images
              </button>
            )}
          </div>
        )
      }
      sidebar={
        <>
          {files.length > 0 ? (
            <div className="sidebar-section">
              <p className="sidebar-section-title">Images Selected</p>
              <p className="range-hint">
                {files.length} image{files.length > 1 ? "s" : ""} — each becomes
                one PDF page
              </p>

              {done && (
                <div
                  className="sidebar-section"
                  style={{ marginTop: "1.2rem" }}
                >
                  <p className="success-msg">✅ Converted! Download started.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="tool-tip">
              💡 Select JPG, JPEG or PNG images. Each image becomes one page in
              the final PDF, fitted to A4 size.
            </div>
          )}
        </>
      }
    >
      <div className="tool-upload-area">
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          onChange={handleFiles}
          id="jpg2pdf-input"
        />
        <label htmlFor="jpg2pdf-input" className="upload-label">
          {files.length === 0 ? "🖼️ Select Images" : "➕ Add More Images"}
        </label>
        <p className="upload-hint">
          JPG, JPEG or PNG — multiple files supported
        </p>
      </div>

      {files.length > 0 && (
        <div className="page-thumb-grid">
          {files.map((file, i) => (
            <div key={i} className="page-thumb-card">
              <button
                className="page-thumb-remove"
                onClick={() => removeFile(i)}
                title="Remove this image"
              >
                ✕
              </button>
              <img src={getPreviewUrl(file)} alt={file.name} />
              <span className="page-thumb-number">{i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </ToolLayout>
  );
}
