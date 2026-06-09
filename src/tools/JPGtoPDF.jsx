import { useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function JPGtoPDF() {
  const [files, setFiles] = useState([]);
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFiles = (e) => {
    const selected = [...e.target.files];
    setFiles(selected);
    setDone(false);
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
        continue; // skip unsupported
      }

      const { width, height } = image.scale(1);

      // A4 size in points
      const a4Width = 595;
      const a4Height = 842;

      // Scale image to fit A4
      const scaleX = a4Width / width;
      const scaleY = a4Height / height;
      const scale = Math.min(scaleX, scaleY, 1);

      const scaledWidth = width * scale;
      const scaledHeight = height * scale;

      const page = pdfDoc.addPage([a4Width, a4Height]);

      // Center image on page
      const x = (a4Width - scaledWidth) / 2;
      const y = (a4Height - scaledHeight) / 2;

      page.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight });
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

  // Image preview
  const getPreviewUrl = (file) => URL.createObjectURL(file);

  return (
    <div className="tool-container">
      <h2>📄 JPG to PDF</h2>
      <p className="tool-desc">
        Convert JPG, JPEG or PNG images to a PDF document. Multiple images =
        multiple pages.
      </p>

      <div className="upload-box">
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          onChange={handleFiles}
          id="jpg2pdf-input"
        />
        <label htmlFor="jpg2pdf-input" className="upload-label">
          🖼️ Select Images
        </label>
        <p className="upload-hint">
          JPG, JPEG or PNG — multiple files supported
        </p>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <p>
            ✅ {files.length} image{files.length > 1 ? "s" : ""} selected:
          </p>
          <div className="image-preview-grid">
            {files.map((file, i) => (
              <div key={i} className="image-preview-item">
                <img
                  src={getPreviewUrl(file)}
                  alt={file.name}
                  className="image-thumb"
                />
                <p className="image-name">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="action-btn"
        onClick={convertToPDF}
        disabled={converting || files.length === 0}
      >
        {converting ? "Converting..." : "📄 Convert to PDF"}
      </button>

      {done && (
        <p className="success-msg">
          ✅ Converted successfully! Download started.
        </p>
      )}
    </div>
  );
}
