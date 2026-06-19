import { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function WatermarkPDF({ onBack }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdfPage, setPdfPage] = useState(null);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  // Watermark settings
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [color, setColor] = useState("#ff0000");
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState("center");

  const handleFile = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setDone(false);
    setLoading(true);

    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) })
      .promise;
    setPageCount(pdf.numPages);

    const page = await pdf.getPage(1);
    setPdfPage(page);
    setLoading(false);
  };

  // PDF page render
  useEffect(() => {
    if (!pdfPage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const viewport = pdfPage.getViewport({ scale: 1.2 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    pdfPage.render({ canvasContext: ctx, viewport }).promise;
  }, [pdfPage]);

  // Live watermark overlay
  useEffect(() => {
    if (!pdfPage || !overlayRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    overlay.width = canvas.width;
    overlay.height = canvas.height;

    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!text.trim()) return;

    let x, y;
    switch (position) {
      case "top":
        x = overlay.width / 2;
        y = 80;
        break;
      case "bottom":
        x = overlay.width / 2;
        y = overlay.height - 60;
        break;
      default:
        x = overlay.width / 2;
        y = overlay.height / 2;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }, [text, fontSize, opacity, color, rotation, position, pdfPage]);

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const applyWatermark = async () => {
    if (!file) return;
    if (!text.trim()) {
      alert("Please enter watermark text!");
      return;
    }
    setApplying(true);

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const { r, g, b } = hexToRgb(color);

    for (const page of pages) {
      const { width, height } = page.getSize();

      let x, y;
      switch (position) {
        case "top":
          x = width / 2;
          y = height - 80;
          break;
        case "bottom":
          x = width / 2;
          y = 60;
          break;
        default:
          x = width / 2;
          y = height / 2;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        color: rgb(r, g, b),
        opacity,
        rotate: degrees(rotation),
      });
    }

    const watermarkedBytes = await pdfDoc.save();
    const blob = new Blob([watermarkedBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const originalName = file.name.replace(".pdf", "");
    a.download = `${originalName}_Watermarked_by_PDFBabu.pdf`;
    a.click();

    setApplying(false);
    setDone(true);
  };

  const reset = () => {
    setFile(null);
    setDone(false);
    setPageCount(0);
    setPdfPage(null);
    setText("CONFIDENTIAL");
    setFontSize(48);
    setOpacity(0.3);
    setColor("#ff0000");
    setRotation(45);
    setPosition("center");
  };

  return (
    <ToolLayout
      title="Add Watermark"
      icon="💧"
      onBack={onBack}
      actionBtn={
        file && (
          <div className="action-btn-group">
            <button
              className="action-btn"
              onClick={applyWatermark}
              disabled={applying || !text.trim()}
            >
              {applying ? "Applying..." : "💧 Apply Watermark"}
            </button>
            {done && (
              <button className="reset-btn" onClick={reset}>
                🔄 Watermark Another PDF
              </button>
            )}
          </div>
        )
      }
      sidebar={
        <>
          {file && (
            <>
              <div className="sidebar-section">
                <p className="sidebar-section-title">Watermark Text</p>
                <input
                  type="text"
                  className="wm-text-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter watermark text..."
                  maxLength={50}
                />
              </div>

              <div className="sidebar-section">
                <p className="sidebar-section-title">Position</p>
                <div
                  className="option-row"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
                >
                  {[
                    { val: "top", icon: "⬆️", label: "Top" },
                    { val: "center", icon: "⊙", label: "Center" },
                    { val: "bottom", icon: "⬇️", label: "Bottom" },
                  ].map((p) => (
                    <label
                      key={p.val}
                      className={`option-card ${position === p.val ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="position"
                        value={p.val}
                        checked={position === p.val}
                        onChange={() => setPosition(p.val)}
                      />
                      <span className="option-icon">{p.icon}</span>
                      <span className="option-title">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="sidebar-section">
                <p className="sidebar-section-title">
                  Font Size — {fontSize}px
                </p>
                <input
                  type="range"
                  min={12}
                  max={120}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="wm-slider"
                />
              </div>

              <div className="sidebar-section">
                <p className="sidebar-section-title">
                  Opacity — {Math.round(opacity * 100)}%
                </p>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                  className="wm-slider"
                />
              </div>

              <div className="sidebar-section">
                <p className="sidebar-section-title">Rotation — {rotation}°</p>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="wm-slider"
                />
              </div>

              <div className="sidebar-section">
                <p className="sidebar-section-title">Color</p>
                <div className="wm-color-row">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="wm-color-picker"
                  />
                  <span className="wm-color-label">{color.toUpperCase()}</span>
                </div>
                <div className="wm-color-presets">
                  {["#ff0000", "#0000ff", "#000000", "#808080", "#00b894"].map(
                    (c) => (
                      <button
                        key={c}
                        className={`wm-color-preset ${color === c ? "active" : ""}`}
                        style={{ background: c }}
                        onClick={() => setColor(c)}
                        title={c}
                      />
                    ),
                  )}
                </div>
              </div>

              {done && (
                <div className="sidebar-section">
                  <p className="success-msg">✅ Watermark applied!</p>
                </div>
              )}
            </>
          )}

          {!file && (
            <div className="tool-tip">
              💡 Upload a PDF and customize your watermark — text, position,
              size, opacity, rotation and color. Live preview updates as you
              type!
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
          id="watermark-input"
        />
        <label htmlFor="watermark-input" className="upload-label">
          {file ? "📂 Change PDF File" : "📂 Select PDF File"}
        </label>
        <p className="upload-hint">Select one PDF file to add watermark</p>
      </div>

      {loading && (
        <div className="progress-box">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "60%" }}></div>
          </div>
          <p className="progress-text">Loading PDF preview...</p>
        </div>
      )}

      {file && !loading && (
        <>
          <div className="tool-file-list">
            <div className="tool-file-item">
              📄 {file.name} — {pageCount} pages
            </div>
          </div>

          {/* Live Preview */}
          <div className="wm-preview-wrap">
            <p className="preview-title">Live Preview — Page 1</p>
            <div className="wm-canvas-wrap">
              <canvas ref={canvasRef} className="wm-canvas-pdf" />
              <canvas ref={overlayRef} className="wm-canvas-overlay" />
            </div>
          </div>
        </>
      )}
    </ToolLayout>
  );
}
