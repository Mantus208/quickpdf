import { useState, useRef, useEffect } from "react";
const BACKEND_URL = "https://quickpdf-backend-zphl.onrender.com";

export default function EditPDF() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [edits, setEdits] = useState({});
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  // ✅ useEffect yahan — component ke top level pe
  useEffect(() => {
    if (pages.length === 0) return;

    function updateScale() {
      const containerWidth =
        wrapperRef.current?.parentElement?.clientWidth || 800;
      const pageWidth = pages[currentPage].width;
      const newScale = Math.min(containerWidth / pageWidth, 1.5);
      setScale(newScale);
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [pages, currentPage]);

  const handleFile = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setLoading(true);
    setPages([]);
    setEdits({});

    const formData = new FormData();
    formData.append("file", selected);

    try {
      const res = await fetch(`${BACKEND_URL}/extract`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setPages(data.pages);
      setCurrentPage(0);
    } catch {
      alert(
        "Failed to load PDF. Make sure backend server is running on port 8000.",
      );
    }

    setLoading(false);
  };

  const handleTextChange = (blockIndex, value) => {
    const key = `${currentPage}-${blockIndex}`;
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const getDisplayText = (blockIndex, originalText) => {
    const key = `${currentPage}-${blockIndex}`;
    return edits[key] !== undefined ? edits[key] : originalText;
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);

    const editsList = [];

    pages.forEach((page, pageIdx) => {
      page.text_blocks.forEach((block, blockIdx) => {
        const key = `${pageIdx}-${blockIdx}`;
        const newText = edits[key];
        if (newText !== undefined && newText !== block.text) {
          editsList.push({
            page: pageIdx + 1,
            x: block.x,
            y: block.y,
            width: block.width,
            height: block.height,
            origin_x: block.origin_x,
            origin_y: block.origin_y,
            old_text: block.text,
            new_text: newText,
            font_size: block.font_size,
            color: block.color,
            font: block.font,
          });
        }
      });
    });

    if (editsList.length === 0) {
      alert("No changes made!");
      setSaving(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("edits", JSON.stringify(editsList));

    try {
      const res = await fetch(`${BACKEND_URL}/save`, {
        method: "POST",
        body: formData,
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const originalName = file.name.replace(".pdf", "");
      a.download = `${originalName}_Edited_by_QuickPDF.pdf`;
      a.click();
    } catch {
      alert("Failed to save PDF.");
    }

    setSaving(false);
  };

  if (!file || pages.length === 0) {
    return (
      <div className="tool-container">
        <h2>✏️ Edit PDF</h2>
        <p className="tool-desc">
          Edit existing text in your PDF. Double-click on any text to edit it
          directly.
        </p>

        <div className="upload-box">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFile}
            id="edit-input"
          />
          <label htmlFor="edit-input" className="upload-label">
            📂 Select PDF File
          </label>
          <p className="upload-hint">Select a PDF to start editing</p>
        </div>

        {loading && (
          <div className="progress-box">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "60%" }}></div>
            </div>
            <p className="progress-text">Loading PDF & extracting text...</p>
          </div>
        )}
      </div>
    );
  }

  const page = pages[currentPage];

  return (
    <div className="tool-container edit-pdf-container">
      <div className="edit-header">
        <h2>✏️ Edit PDF</h2>
        <p className="tool-desc">Double-click any text to edit it.</p>
      </div>

      <div className="edit-page-nav">
        <button
          className="nav-btn"
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          ← Prev
        </button>
        <span className="page-indicator">
          Page {currentPage + 1} / {pages.length}
        </span>
        <button
          className="nav-btn"
          onClick={() =>
            setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
          }
          disabled={currentPage === pages.length - 1}
        >
          Next →
        </button>
      </div>

      <div
        ref={wrapperRef}
        className="edit-canvas-wrapper"
        style={{
          width: page.width * scale,
          height: page.height * scale,
        }}
      >
        <img
          src={page.image}
          alt={`Page ${currentPage + 1}`}
          style={{
            width: page.width * scale,
            height: page.height * scale,
            display: "block",
          }}
        />

        {page.text_blocks.map((block, idx) => {
          const isEditing = editingIndex === idx;
          const key = `${currentPage}-${idx}`;
          const isEdited = edits[key] !== undefined;

          return isEditing ? (
            <input
              key={idx}
              autoFocus
              className="edit-text-input"
              style={{
                left: block.x * scale,
                top: block.y * scale,
                width: Math.max(block.width * scale, 30),
                height: block.height * scale + 4,
                fontSize: block.font_size * scale,
              }}
              value={getDisplayText(idx, block.text)}
              onChange={(e) => handleTextChange(idx, e.target.value)}
              onBlur={() => setEditingIndex(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingIndex(null);
              }}
            />
          ) : (
            <div
              key={idx}
              className={`edit-text-overlay ${isEdited ? "edited" : ""}`}
              style={{
                left: block.x * scale,
                top: block.y * scale,
                width: block.width * scale,
                height: block.height * scale,
              }}
              onDoubleClick={() => setEditingIndex(idx)}
              title="Double-click to edit"
            >
              {isEdited && (
                <span
                  className="edited-text-preview"
                  style={{
                    fontSize: block.font_size * scale,
                    fontWeight: block.font.toLowerCase().includes("bold")
                      ? "bold"
                      : "normal",
                    fontStyle: block.font.toLowerCase().includes("italic")
                      ? "italic"
                      : "normal",
                  }}
                >
                  {getDisplayText(idx, block.text)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="edit-actions">
        <button
          className="reset-btn"
          onClick={() => {
            setFile(null);
            setPages([]);
            setEdits({});
          }}
        >
          🔄 Edit Another PDF
        </button>
        <button className="action-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "💾 Save & Download PDF"}
        </button>
      </div>
    </div>
  );
}
