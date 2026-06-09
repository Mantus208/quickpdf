import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";

export default function PageCounter() {
  const [mode, setMode] = useState("single");
  const [singleFile, setSingleFile] = useState(null);
  const [singleCount, setSingleCount] = useState(null);
  const [multiFiles, setMultiFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleSingleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSingleFile(file);
    setSingleCount(null);
    setDone(false);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    setSingleCount(pdf.getPageCount());
  };

  const handleMultiFiles = (e) => {
    setMultiFiles([...e.target.files]);
    setResults([]);
    setDone(false);
  };

  const processMultiple = async () => {
    if (multiFiles.length === 0) {
      alert("Please select PDF files!");
      return;
    }
    setProcessing(true);

    const data = [];
    for (const file of multiFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        data.push({
          "File Name": file.name,
          "Page Count": pdf.getPageCount(),
          "File Size (KB)": (file.size / 1024).toFixed(1),
        });
      } catch {
        data.push({
          "File Name": file.name,
          "Page Count": "Error",
          "File Size (KB)": (file.size / 1024).toFixed(1),
        });
      }
    }

    setResults(data);

    // Export to Excel
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    // Column widths
    ws["!cols"] = [{ wch: 40 }, { wch: 15 }, { wch: 18 }];

    XLSX.utils.book_append_sheet(wb, ws, "PDF Page Count");
    XLSX.writeFile(wb, "pdf_page_count.xlsx");

    setProcessing(false);
    setDone(true);
  };

  return (
    <div className="tool-container">
      <h2>🔢 PDF Page Counter</h2>
      <p className="tool-desc">
        Count pages in a single PDF instantly, or count multiple PDFs and export
        results to Excel.
      </p>

      {/* Mode Toggle */}
      <div className="option-row" style={{ marginBottom: "1.5rem" }}>
        <label className={`option-card ${mode === "single" ? "active" : ""}`}>
          <input
            type="radio"
            name="mode"
            value="single"
            checked={mode === "single"}
            onChange={() => {
              setMode("single");
              setSingleFile(null);
              setSingleCount(null);
            }}
          />
          <span>📄 Single PDF</span>
          <small>Get page count instantly on screen</small>
        </label>
        <label className={`option-card ${mode === "multi" ? "active" : ""}`}>
          <input
            type="radio"
            name="mode"
            value="multi"
            checked={mode === "multi"}
            onChange={() => {
              setMode("multi");
              setMultiFiles([]);
              setResults([]);
            }}
          />
          <span>📁 Multiple PDFs</span>
          <small>Export all results to Excel file</small>
        </label>
      </div>

      {/* Single Mode */}
      {mode === "single" && (
        <>
          <div className="upload-box">
            <input
              type="file"
              accept=".pdf"
              onChange={handleSingleFile}
              id="counter-single-input"
            />
            <label htmlFor="counter-single-input" className="upload-label">
              📂 Select PDF File
            </label>
            <p className="upload-hint">Select one PDF to count its pages</p>
          </div>

          {singleFile && singleCount !== null && (
            <div className="counter-result">
              <div className="counter-file-name">📄 {singleFile.name}</div>
              <div className="counter-number">{singleCount}</div>
              <div className="counter-label">Total Pages</div>
              <div className="counter-size">
                File size: {(singleFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          )}
        </>
      )}

      {/* Multi Mode */}
      {mode === "multi" && (
        <>
          <div className="upload-box">
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleMultiFiles}
              id="counter-multi-input"
            />
            <label htmlFor="counter-multi-input" className="upload-label">
              📂 Select Multiple PDFs
            </label>
            <p className="upload-hint">
              Select all PDF files you want to count
            </p>
          </div>

          {multiFiles.length > 0 && (
            <div className="file-list">
              <p>✅ {multiFiles.length} files selected</p>
              {[...multiFiles].map((f, i) => (
                <div key={i} className="file-item">
                  📄 {f.name}
                </div>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Pages</th>
                    <th>Size (KB)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td>{r["File Name"]}</td>
                      <td className="page-count-cell">{r["Page Count"]}</td>
                      <td>{r["File Size (KB)"]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="action-btn"
            onClick={processMultiple}
            disabled={processing || multiFiles.length === 0}
          >
            {processing ? "Processing..." : "📊 Count & Export to Excel"}
          </button>

          {done && (
            <p className="success-msg">
              ✅ Done! Excel file downloaded successfully.
            </p>
          )}
        </>
      )}
    </div>
  );
}
