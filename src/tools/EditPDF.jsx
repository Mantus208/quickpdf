import { useState, useRef, useEffect } from "react";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function EditPDF() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [edits, setEdits] = useState({});
  const [positions, setPositions] = useState({}); // { "page-blockIndex": {x, y} }
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);
  const dragState = useRef(null);

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
    setPositions({});

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

  const getPosition = (blockIndex, block) => {
    const key = `${currentPage}-${blockIndex}`;
    return positions[key] || { x: block.x, y: block.y };
  };

  // Approx text width estimate karo (canvas measureText)
  const estimateTextWidth = (text, fontSize, isBold) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = `${isBold ? "bold " : ""}${fontSize}px Arial`;
    return ctx.measureText(text).width;
  };

  // --- Drag handlers ---
  const handleDragStart = (e, blockIndex, block) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPosition(blockIndex, block);
    dragState.current = {
      blockIndex,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: pos.x,
      startY: pos.y,
    };
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
  };

  const handleDragMove = (e) => {
    if (!dragState.current) return;
    const { blockIndex, startMouseX, startMouseY, startX, startY } =
      dragState.current;
    const dx = (e.clientX - startMouseX) / scale;
    const dy = (e.clientY - startMouseY) / scale;

    const key = `${currentPage}-${blockIndex}`;
    setPositions((prev) => ({
      ...prev,
      [key]: { x: startX + dx, y: startY + dy },
    }));
  };

  const handleDragEnd = () => {
    dragState.current = null;
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);

    const editsList = [];

    pages.forEach((page, pageIdx) => {
      page.text_blocks.forEach((block, blockIdx) => {
        const key = `${pageIdx}-${blockIdx}`;
        const newText = edits[key];
        const newPos = positions[key];
        const textChanged = newText !== undefined && newText !== block.text;
        const posChanged = newPos !== undefined;

        if (textChanged || posChanged) {
          const finalX = newPos ? newPos.x : block.x;
          const finalY = newPos ? newPos.y : block.y;
          const deltaX = finalX - block.x;
          const deltaY = finalY - block.y;

          editsList.push({
            page: pageIdx + 1,
            x: finalX,
            y: finalY,
            width: block.width,
            height: block.height,
            origin_x: block.origin_x + deltaX,
            origin_y: block.origin_y + deltaY,
            old_text: block.text,
            new_text: textChanged ? newText : block.text,
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
      a.download = `${originalName}_Edited_by_PDFBabu.pdf`;
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
        <p className="tool-desc">
          Double-click any text to edit it. Drag the ⠿ handle on edited text to
          reposition it.
        </p>
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
          const pos = getPosition(idx, block);
          const isBold = block.font.toLowerCase().includes("bold");
          const displayText = getDisplayText(idx, block.text);

          // Input box ki dynamic width — text length ke according
          const estimatedWidth = estimateTextWidth(
            displayText || " ",
            block.font_size * scale,
            isBold,
          );
          const inputWidth = Math.max(block.width * scale, estimatedWidth + 12);

          return isEditing ? (
            <input
              key={idx}
              autoFocus
              className="edit-text-input"
              style={{
                left: pos.x * scale,
                top: pos.y * scale,
                width: inputWidth,
                height: block.height * scale + 4,
                fontSize: block.font_size * scale,
                fontWeight: isBold ? "bold" : "normal",
              }}
              value={displayText}
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
                left: pos.x * scale,
                top: pos.y * scale,
                width: isEdited
                  ? Math.max(block.width * scale, estimatedWidth + 8)
                  : block.width * scale,
                height: block.height * scale,
              }}
              onDoubleClick={() => setEditingIndex(idx)}
              title="Double-click to edit"
            >
              {isEdited && (
                <>
                  <span
                    className="edited-text-preview"
                    style={{
                      fontSize: block.font_size * scale,
                      fontWeight: isBold ? "bold" : "normal",
                      fontStyle: block.font.toLowerCase().includes("italic")
                        ? "italic"
                        : "normal",
                    }}
                  >
                    {displayText}
                  </span>
                  <span
                    className="drag-handle-icon"
                    onMouseDown={(e) => handleDragStart(e, idx, block)}
                    title="Drag to reposition"
                  >
                    ⠿
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="edit-actions">
        <button
          className="reset-btn pro-btn"
          onClick={() => {
            setFile(null);
            setPages([]);
            setEdits({});
            setPositions({});
          }}
        >
          <span className="pro-btn-icon">🔄</span>
          Edit Another PDF
        </button>
        <button
          className="action-btn pro-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="btn-spinner"></span>
              Saving...
            </>
          ) : (
            <>
              <span className="pro-btn-icon">💾</span>
              Save & Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
