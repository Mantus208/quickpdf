import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import ExcelJS from "exceljs";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PageCounter({ onBack }) {
  const [files, setFiles] = useState([]);
  const [folderFiles, setFolderFiles] = useState([]);
  const [mode, setMode] = useState("files");
  const [thumbnails, setThumbnails] = useState([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const generateThumbnail = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) })
        .promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch {
      return null;
    }
  };

  const loadThumbnails = async (selectedFiles) => {
    setLoadingThumbs(true);
    const thumbs = await Promise.all(selectedFiles.map(generateThumbnail));
    setThumbnails(thumbs);
    setLoadingThumbs(false);
  };

  const handleFiles = async (e) => {
    const selected = [...e.target.files].filter((f) => f.name.endsWith(".pdf"));
    setFiles(selected);
    setResults([]);
    setDone(false);
    await loadThumbnails(selected);
  };

  const handleFolder = async (e) => {
    const selected = [...e.target.files].filter((f) => f.name.endsWith(".pdf"));
    setFolderFiles(selected);
    setResults([]);
    setDone(false);
    await loadThumbnails(selected);
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

    if (data.length === 1) {
      setProcessing(false);
      setDone(true);
      return;
    }

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

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF6C3FF5" },
      };
    });

    data.forEach((r) => {
      const row = {
        name: r["File Name"],
        pages: r["Page Count"],
        size: r["File Size (KB)"],
      };
      if (mode === "folder") row.path = r["File Path"];
      sheet.addRow(row);
    });

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

  const reset = () => {
    setFiles([]);
    setFolderFiles([]);
    setResults([]);
    setThumbnails([]);
    setDone(false);
  };

  const totalPages = results.reduce((sum, r) => {
    return typeof r["Page Count"] === "number" ? sum + r["Page Count"] : sum;
  }, 0);

  const targetCount = mode === "files" ? files.length : folderFiles.length;
  const activeFiles = mode === "files" ? files : folderFiles;

  return (
    <ToolLayout
      title="PDF Page Counter"
      icon="🔢"
      onBack={onBack}
      actionBtn={
        targetCount > 0 && (
          <>
            {done && (
              <button className="reset-btn" onClick={reset}>
                🔄 Count More PDFs
              </button>
            )}
            <button
              className="action-btn"
              onClick={processFiles}
              disabled={processing || targetCount === 0}
            >
              {processing ? "Processing..." : `🔢 Count Pages (${targetCount})`}
            </button>
          </>
        )
      }
      sidebar={
        <>
          <div className="sidebar-section">
            <p className="sidebar-section-title">Input Mode</p>
            <div
              className="option-row"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <label
                className={`option-card ${mode === "files" ? "active" : ""}`}
              >
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
                <span>📄 Files</span>
                <small>One or multiple PDFs</small>
              </label>
              <label
                className={`option-card ${mode === "folder" ? "active" : ""}`}
              >
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
                <span>📁 Folder</span>
                <small>Auto-finds all PDFs</small>
              </label>
            </div>
          </div>

          {targetCount > 0 && (
            <div className="sidebar-section">
              <p className="sidebar-section-title">Selected</p>
              <p className="range-hint">
                {targetCount} PDF{targetCount > 1 ? "s" : ""}{" "}
                {mode === "folder" ? "found in folder" : "selected"}
              </p>
            </div>
          )}

          {done && (
            <div className="sidebar-section">
              <p className="success-msg">
                {results.length > 1 ? "✅ Excel file downloaded!" : "✅ Done!"}
              </p>
            </div>
          )}

          {targetCount === 0 && (
            <div className="tool-tip">
              💡 Select PDF files, or a whole folder — all PDFs inside will be
              auto-detected. One file shows the count on screen, multiple files
              export to Excel.
            </div>
          )}
        </>
      }
    >
      {mode === "files" && (
        <div className="tool-upload-area">
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

      {mode === "folder" && (
        <div className="tool-upload-area">
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

      {loadingThumbs && (
        <div className="progress-box">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "70%" }}></div>
          </div>
          <p className="progress-text">Generating previews...</p>
        </div>
      )}

      {!loadingThumbs && activeFiles.length > 0 && results.length === 0 && (
        <div className="page-thumb-grid">
          {activeFiles.map((f, i) => (
            <div key={i} className="page-thumb-card">
              {thumbnails[i] ? (
                <img src={thumbnails[i]} alt={f.name} />
              ) : (
                <div
                  style={{
                    height: "120px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f8f7ff",
                    fontSize: "2rem",
                  }}
                >
                  📄
                </div>
              )}
              <span
                className="page-thumb-number"
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  padding: "0.4rem 0.3rem",
                }}
                title={f.name}
              >
                {f.name}
              </span>
            </div>
          ))}
        </div>
      )}

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
    </ToolLayout>
  );
}
