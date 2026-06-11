import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function UnlockPDF() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pdfInfo, setPdfInfo] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFile = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setDone(false);
    setError("");
    setPdfInfo(null);
    setProgress(0);
    setPassword("");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      try {
        const pdfDoc = await pdfjsLib.getDocument({
          data: arrayBuffer,
        }).promise;
        const meta = await pdfDoc.getMetadata().catch(() => ({}));
        setPdfInfo({
          pages: pdfDoc.numPages,
          title: meta?.info?.Title || "—",
          author: meta?.info?.Author || "—",
          size: (selectedFile.size / 1024).toFixed(1),
          isPasswordProtected: false,
        });
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

      // Password sahi tha — ab info update karo
      const meta = await pdfDoc.getMetadata().catch(() => ({}));
      setPdfInfo((prev) => ({
        ...prev,
        pages: pdfDoc.numPages,
        title: meta?.info?.Title || "—",
        author: meta?.info?.Author || "—",
      }));

      // Canvas pe render karke naya PDF banao
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
      a.download = `${originalName}_Unlocked_by_QuickPDF.pdf`;
      a.click();

      setDone(true);
    } catch {
      setError("❌ Failed to unlock. Please try again.");
    }

    setUnlocking(false);
  };

  return (
    <div className="tool-container">
      <h2>🔓 Unlock PDF</h2>
      <p className="tool-desc">
        Remove PDF restrictions and password protection — instantly and for
        free.
      </p>

      <div className="upload-box">
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

      {pdfInfo && (
        <div className="pdf-info-card">
          <p className="info-title">📋 PDF Details</p>
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
              🔒 Password protected — Enter password below to unlock.
            </div>
          ) : (
            <div className="info-notice success-notice">
              ✅ No password needed — Click unlock to remove restrictions.
            </div>
          )}
        </div>
      )}

      {/* Password field — sirf password protected PDF ke liye */}
      {pdfInfo?.isPasswordProtected && (
        <div className="password-box">
          <label className="password-label">🔑 Enter PDF Password</label>
          <div className="password-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              className="password-input"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
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
            Correct password required to unlock this PDF
          </small>
        </div>
      )}

      {unlocking && (
        <div className="progress-box">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">Unlocking... {progress}%</p>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      {file && pdfInfo && (
        <button
          className="action-btn"
          onClick={unlockPDF}
          disabled={unlocking || (pdfInfo.isPasswordProtected && !password)}
        >
          {unlocking ? `Unlocking ${progress}%...` : "🔓 Unlock PDF"}
        </button>
      )}

      {done && (
        <>
          <p className="success-msg">
            ✅ PDF unlocked! All restrictions removed.
          </p>
          <button
            className="reset-btn"
            onClick={() => {
              setFile(null);
              setDone(false);
              setPdfInfo(null);
              setPassword("");
              setProgress(0);
            }}
          >
            🔄 Unlock Another PDF
          </button>
        </>
      )}
    </div>
  );
}
