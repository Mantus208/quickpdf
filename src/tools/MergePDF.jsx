import { useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function MergePDF() {
  const [files, setFiles] = useState([]);
  const [merging, setMerging] = useState(false);
  const [done, setDone] = useState(false);

  const handleFiles = (e) => {
    setFiles([...e.target.files]);
    setDone(false);
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Please select at least 2 PDF files!");
      return;
    }
    setMerging(true);
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }
    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged.pdf";
    a.click();
    setMerging(false);
    setDone(true);
  };

  return (
    <div className="tool-container">
      <h2>🔗 Merge PDF</h2>
      <p className="tool-desc">
        Combine multiple PDF files into one single document.
      </p>

      <div className="upload-box">
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFiles}
          id="merge-input"
        />
        <label htmlFor="merge-input" className="upload-label">
          📂 Select PDF Files
        </label>
        <p className="upload-hint">Select 2 or more PDF files</p>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <p>✅ {files.length} files selected:</p>
          {[...files].map((f, i) => (
            <div key={i} className="file-item">
              📄 {f.name}
            </div>
          ))}
        </div>
      )}

      <button
        className="action-btn"
        onClick={mergePDFs}
        disabled={merging || files.length < 2}
      >
        {merging ? "Merging..." : "🔗 Merge PDF"}
      </button>

      {done && (
        <p className="success-msg">
          ✅ PDF merged successfully! Download started.
        </p>
      )}
    </div>
  );
}
