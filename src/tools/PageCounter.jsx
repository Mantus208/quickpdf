import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ExcelJS from "exceljs";

export default function PageCounter() {
  const [files, setFiles] = useState([]);
  const [folderFiles, setFolderFiles] = useState([]);
  const [mode, setMode] = useState("files");
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleFiles = (e) => {
    const selected = [...e.target.files].filter((f) => f.name.endsWith(".pdf"));
    setFiles(selected);
    setResults([]);
    setDone(false);
  };

  const handleFolder = (e) => {
    const selected = [...e.target.files].filter((f) => f.name.endsWith(".pdf"));
    setFolderFiles(selected);
    setResults([]);
    setDone(false);
  };

  const processFiles = async () => {
    const targetFiles = mode === "files" ? files : folderFiles;
    if (targetFiles.length === 0) {
      alert("No PDF files found!");
      return;
    }
    setProcessing(true);

    const data = [];
    for (const file of targetFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        data.push({
          "File Name": file.name,
          "File Path":
            mode === "folder"
              ? file.webkitRelativePath || file.name
              : "N/A — Use Folder mode for paths",
          "Page Count": pdf.getPageCount(),
          "File Size (KB)": (file.size / 1024).toFixed(1),
        });
      } catch {
        data.push({
          "File Name": file.name,
          "File Path": file.webkitRelativePath || file.name,
          "Page Count": "Error",
          "File Size (KB)": (file.size / 1024).toFixed(1),
        });
      }
    }

    setResults(data);

    // Single file — sirf screen pe dikhao
    if (data.length === 1) {
      setProcessing(false);
      setDone(true);
      return;
    }

    // Multiple files — Excel export
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("PDF Page Count");

    sheet.columns = [
      { header: "File Name", key: "name", width: 35 },
      ...(mode === "folder"
        ? [{ header: "File Path", key: "path", width: 50 }]
        : []),
      { header: "Page Count", key: "pages", width: 15 },
      { header: "File Size (KB)", key: "size", width: 18 },
    ];

    // Header row purple styling
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF6C3FF5" },
      };
    });

    // Data rows
    data.forEach((r) => {
      const row = {
        name: r["File Name"],
        pages: r["Page Count"],
        size: r["File Size (KB)"],
      };
      if (mode === "folder") row.path = r["File Path"];
      sheet.addRow(row);
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf_page_count.xlsx";
    a.click();

    setProcessing(false);
    setDone(true);
  };

  const totalPages = results.reduce((sum, r) => {
    return typeof r["Page Count"] === "number" ? sum + r["Page Count"] : sum;
  }, 0);

  return (
    <div className="tool-container">
      <h2>🔢 PDF Page Counter</h2>
      <p className="tool-desc">
        Count pages in PDF files. Single file shows result on screen. Multiple
        files export to Excel.
      </p>

      {/* Mode Toggle */}
      <div className="option-row" style={{ marginBottom: "1.5rem" }}>
        <label className={`option-card ${mode === "files" ? "active" : ""}`}>
          <input
            type="radio"
            name="mode"
            value="files"
            checked={mode === "files"}
            onChange={() => {
              setMode("files");
              setResults([]);
              setDone(false);
            }}
          />
          <span>📄 Select PDF Files</span>
          <small>Select one or multiple PDF files</small>
        </label>
        <label className={`option-card ${mode === "folder" ? "active" : ""}`}>
          <input
            type="radio"
            name="mode"
            value="folder"
            checked={mode === "folder"}
            onChange={() => {
              setMode("folder");
              setResults([]);
              setDone(false);
            }}
          />
          <span>📁 Select Folder</span>
          <small>Auto-finds all PDFs in folder</small>
        </label>
      </div>

      {/* File Mode */}
      {mode === "files" && (
        <div className="upload-box">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFiles}
            id="counter-files-input"
          />
          <label htmlFor="counter-files-input" className="upload-label">
            📂 Select PDF Files
          </label>
          <p className="upload-hint">
            1 file = show on screen · Multiple files = export to Excel
          </p>
        </div>
      )}

      {/* Folder Mode */}
      {mode === "folder" && (
        <div className="upload-box">
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFolder}
            id="counter-folder-input"
          />
          <label htmlFor="counter-folder-input" className="upload-label">
            📁 Select Folder
          </label>
          <p className="upload-hint">
            All PDFs in folder will be auto-detected and counted
          </p>
        </div>
      )}

      {/* Files selected info */}
      {mode === "files" && files.length > 0 && results.length === 0 && (
        <div className="file-list">
          <p>
            ✅ {files.length} PDF{files.length > 1 ? "s" : ""} selected
          </p>
          {files.map((f, i) => (
            <div key={i} className="file-item">
              📄 {f.name}
            </div>
          ))}
        </div>
      )}

      {mode === "folder" && folderFiles.length > 0 && results.length === 0 && (
        <div className="file-list">
          <p>
            ✅ {folderFiles.length} PDF{folderFiles.length > 1 ? "s" : ""} found
            in folder
          </p>
          {folderFiles.map((f, i) => (
            <div key={i} className="file-item">
              📄 {f.webkitRelativePath || f.name}
            </div>
          ))}
        </div>
      )}

      {/* Single file result */}
      {results.length === 1 && (
        <div className="counter-result">
          <div className="counter-file-name">📄 {results[0]["File Name"]}</div>
          <div className="counter-number">{results[0]["Page Count"]}</div>
          <div className="counter-label">Total Pages</div>
          <div className="counter-size">
            File size: {results[0]["File Size (KB)"]} KB
          </div>
        </div>
      )}

      {/* Multiple results table */}
      {results.length > 1 && (
        <>
          <div className="counter-summary">
            <div className="summary-item">
              <span className="summary-num">{results.length}</span>
              <span className="summary-label">PDF Files</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-num">{totalPages}</span>
              <span className="summary-label">Total Pages</span>
            </div>
          </div>

          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>File Name</th>
                  {mode === "folder" && <th>Path</th>}
                  <th>Pages</th>
                  <th>Size (KB)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r["File Name"]}</td>
                    {mode === "folder" && (
                      <td className="path-cell">{r["File Path"]}</td>
                    )}
                    <td className="page-count-cell">{r["Page Count"]}</td>
                    <td>{r["File Size (KB)"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <button
        className="action-btn"
        onClick={processFiles}
        disabled={
          processing ||
          (mode === "files" && files.length === 0) ||
          (mode === "folder" && folderFiles.length === 0)
        }
      >
        {processing ? "Processing..." : "🔢 Count Pages"}
      </button>

      {done && results.length > 1 && (
        <p className="success-msg">
          ✅ Done! Excel file downloaded successfully.
        </p>
      )}
    </div>
  );
}
