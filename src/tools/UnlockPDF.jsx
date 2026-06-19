import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function UnlockPDF({ onBack }) {
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pdfInfo, setPdfInfo] = useState(null);
  const [progress, setProgress] = useState(0);

  const generateThumbnail = async (arrayBuffer, pass = "") => {
    try {
      const pdfDoc = await pdfjsLib.getDocument({
        data: arrayBuffer.slice(0),
        password: pass,
      }).promise;
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch {
      return null;
    }
  };

  const handleFile = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setDone(false);
    setError("");
    setPdfInfo(null);
    setProgress(0);
    setPassword("");
    setThumbnail(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      try {
        const pdfDoc = await pdfjsLib.getDocument({
          data: arrayBuffer.slice(0),
        }).promise;
        const meta = await pdfDoc.getMetadata().catch(() => ({}));
        setPdfInfo({
          pages: pdfDoc.numPages,
          title: meta?.info?.Title || "—",
          author: meta?.info?.Author || "—",
          size: (selectedFile.size / 1024).toFixed(1),
          isPasswordProtected: false,
        });

        const thumb = await generateThumbnail(arrayBuffer);
        setThumbnail(thumb);
      } catch (err) {
        if (err?.name === "PasswordException") {
          setPdfInfo({
            pages: "?",
            title: "—",
            author: "—",
            size: (selectedFile.size / 1024).toFixed(1),
            isPasswordProtected: true,
          });
        } else {
          setError("❌ Invalid PDF file. Please try another file.");
        }
      }
    } catch {
      setError("❌ Could not read this file.");
    }
  };

  const tryPreviewWithPassword = async (pass) => {
    if (!file || !pass) return;
    setPreviewLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const thumb = await generateThumbnail(arrayBuffer, pass);
      if (thumb) {
        setThumbnail(thumb);
      }
    } catch {
      // silent — wrong password, unlock click par error dikhayenge
    }
    setPreviewLoading(false);
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setError("");

    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      if (value.length > 0) tryPreviewWithPassword(value);
    }, 600);
    setDebounceTimer(timer);
  };

  const unlockPDF = async () => {
    if (!file) return;
    setUnlocking(true);
    setError("");
    setDone(false);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();

      let pdfDoc;
      try {
        pdfDoc = await pdfjsLib.getDocument({
          data: arrayBuffer,
          password: pdfInfo.isPasswordProtected ? password : "",
        }).promise;
      } catch (err) {
        if (err?.name === "PasswordException") {
          setError("❌ Wrong password! Please try again.");
          setUnlocking(false);
          return;
        }
        throw err;
      }

      const meta = await pdfDoc.getMetadata().catch(() => ({}));
      setPdfInfo((prev) => ({
        ...prev,
        pages: pdfDoc.numPages,
        title: meta?.info?.Title || "—",
        author: meta?.info?.Author || "—",
      }));

      if (!thumbnail) {
        const thumb = await generateThumbnail(arrayBuffer, password);
        setThumbnail(thumb);
      }

      const newPdf = await PDFDocument.create();
      const totalPages = pdfDoc.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const base64 = imgData.split(",")[1];
        const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        const jpgImage = await newPdf.embedJpg(imgBytes);
        const { width, height } = jpgImage.scale(1);
        const newPage = newPdf.addPage([width, height]);
        newPage.drawImage(jpgImage, { x: 0, y: 0, width, height });

        setProgress(Math.round((i / totalPages) * 100));
      }

      const unlockedBytes = await newPdf.save();
      const blob = new Blob([unlockedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const originalName = file.name.replace(".pdf", "");
      a.download = `${originalName}_Unlocked_by_PDFBabu.pdf`;
      a.click();

      setDone(true);
    } catch {
      setError("❌ Failed to unlock. Please try again.");
    }

    setUnlocking(false);
  };

  const reset = () => {
    setFile(null);
    setDone(false);
    setPdfInfo(null);
    setPassword("");
    setProgress(0);
    setThumbnail(null);
    setError("");
  };

  return (
    <ToolLayout
      title="Unlock PDF"
      icon="🔓"
      onBack={onBack}
      actionBtn={
        file &&
        pdfInfo && (
          <div className="action-btn-group">
            <button
              className="action-btn"
              onClick={unlockPDF}
              disabled={unlocking || (pdfInfo.isPasswordProtected && !password)}
            >
              {unlocking ? `Unlocking ${progress}%...` : "🔓 Unlock PDF"}
            </button>
            {done && (
              <button className="reset-btn" onClick={reset}>
                🔄 Unlock Another PDF
              </button>
            )}
          </div>
        )
      }
      sidebar={
        <>
          {pdfInfo && (
            <div className="sidebar-section">
              <p className="sidebar-section-title">PDF Details</p>
              <div className="pdf-info-card" style={{ margin: 0 }}>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Pages</span>
                    <span className="info-value">{pdfInfo.pages}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">File Size</span>
                    <span className="info-value">{pdfInfo.size} KB</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Title</span>
                    <span className="info-value">{pdfInfo.title}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Author</span>
                    <span className="info-value">{pdfInfo.author}</span>
                  </div>
                </div>

                {pdfInfo.isPasswordProtected ? (
                  <div className="info-notice warning-notice">
                    🔒 Password protected — Enter password to unlock.
                  </div>
                ) : (
                  <div className="info-notice success-notice">
                    ✅ No password needed — Click unlock to remove restrictions.
                  </div>
                )}
              </div>
            </div>
          )}

          {pdfInfo?.isPasswordProtected && (
            <div className="sidebar-section">
              <p className="sidebar-section-title">PDF Password</p>
              <div className="password-box" style={{ margin: 0 }}>
                <div className="password-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="password-input"
                    placeholder="Enter password..."
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <button
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <small className="password-hint">
                  {previewLoading
                    ? "Checking password..."
                    : thumbnail
                      ? "✅ Password correct — preview loaded"
                      : "Correct password required to unlock this PDF"}
                </small>
              </div>
            </div>
          )}

          {error && (
            <div className="sidebar-section">
              <p className="error-msg">{error}</p>
            </div>
          )}

          {done && (
            <div className="sidebar-section">
              <p className="success-msg">
                ✅ PDF unlocked! All restrictions removed.
              </p>
            </div>
          )}

          {!file && (
            <div className="tool-tip">
              💡 Select a restricted or password-protected PDF. This tool
              removes print/copy/edit locks and password protection, then gives
              you a clean, fully usable PDF.
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
          id="unlock-input"
        />
        <label htmlFor="unlock-input" className="upload-label">
          📂 Select PDF File
        </label>
        <p className="upload-hint">
          Select a restricted or password-protected PDF
        </p>
      </div>

      {file && (
        <div className="tool-file-list">
          <div className="tool-file-item">
            📄 {file.name} — {pdfInfo?.size} KB
          </div>
        </div>
      )}

      {file && (
        <div className="page-thumb-grid" style={{ marginTop: "1.5rem" }}>
          <div className="page-thumb-card">
            {thumbnail ? (
              <img src={thumbnail} alt="PDF preview" />
            ) : previewLoading ? (
              <div
                style={{
                  height: "160px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f8f7ff",
                  fontSize: "1.5rem",
                }}
              >
                ⏳
              </div>
            ) : (
              <div
                style={{
                  height: "160px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f8f7ff",
                  fontSize: "2.5rem",
                }}
              >
                🔒
              </div>
            )}
            <span className="page-thumb-number">
              {thumbnail ? "Page 1 preview" : "Locked — enter password"}
            </span>
          </div>
        </div>
      )}

      {unlocking && (
        <div className="progress-box" style={{ marginTop: "1.5rem" }}>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">Unlocking... {progress}%</p>
        </div>
      )}
    </ToolLayout>
  );
}
