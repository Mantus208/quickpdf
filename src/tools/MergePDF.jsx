import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ToolLayout from "../components/ToolLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function MergePDF({ onBack }) {
  const [files, setFiles] = useState([]);
  const [merging, setMerging] = useState(false);
  const [done, setDone] = useState(false);

  const generatePreview = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.4 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const handleFiles = async (e) => {
    const selected = [...e.target.files];
    if (selected.length === 0) return;
    setDone(false);

    const newPreviews = await Promise.all(selected.map(generatePreview));

    const newItems = selected.map((file, i) => ({
      id: `${Date.now()}_${i}`,
      file,
      preview: newPreviews[i],
      pageCount: 0,
    }));

    for (const item of newItems) {
      const ab = await item.file.arrayBuffer();
      const pdf = await PDFDocument.load(ab);
      item.pageCount = pdf.getPageCount();
    }

    setFiles((prev) => [...prev, ...newItems]);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = [...files];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setFiles(reordered);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Please select at least 2 PDF files!");
      return;
    }
    setMerging(true);

    const mergedPdf = await PDFDocument.create();
    for (const item of files) {
      const arrayBuffer = await item.file.arrayBuffer();
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

  const reset = () => {
    setFiles([]);
    setDone(false);
  };

  return (
    <ToolLayout
      title="Merge PDF"
      icon="🔗"
      onBack={onBack}
      actionBtn={
        files.length > 0 && (
          <>
            {done && (
              <button className="reset-btn" onClick={reset}>
                🔄 Merge Another PDF
              </button>
            )}
            <button
              className="action-btn"
              onClick={mergePDFs}
              disabled={merging || files.length < 2}
            >
              {merging ? "Merging..." : `🔗 Merge PDF (${files.length} files)`}
            </button>
          </>
        )
      }
      sidebar={
        <>
          {files.length > 0 ? (
            <div className="sidebar-section">
              <p className="sidebar-section-title">Files Selected</p>
              <p className="range-hint">
                {files.length} file{files.length > 1 ? "s" : ""} added
              </p>
              {files.length < 2 && (
                <p
                  className="range-hint"
                  style={{ color: "#e74c3c", marginTop: "0.5rem" }}
                >
                  ⚠️ Add at least 2 files to merge
                </p>
              )}

              <div className="sidebar-section" style={{ marginTop: "1.2rem" }}>
                <p className="sidebar-section-title">Total Pages</p>
                <p className="range-hint">
                  {files.reduce((sum, f) => sum + f.pageCount, 0)} pages
                  combined
                </p>
              </div>
            </div>
          ) : (
            <div className="tool-tip">
              💡 Select 2 or more PDF files. Drag items in the list to reorder
              them before merging.
            </div>
          )}
        </>
      }
    >
      <div className="tool-upload-area">
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFiles}
          id="merge-input"
        />
        <label htmlFor="merge-input" className="upload-label">
          {files.length === 0 ? "📂 Select PDF Files" : "➕ Add More Files"}
        </label>
        <p className="upload-hint">Select 2 or more PDF files to merge</p>
      </div>

      {files.length > 0 && (
        <>
          <p className="options-label">
            {files.length} file{files.length > 1 ? "s" : ""} — Drag to reorder:
          </p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="pdf-list">
              {(provided) => (
                <div
                  className="merge-preview-list"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {files.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          className={`merge-preview-item ${snapshot.isDragging ? "dragging" : ""}`}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <div className="merge-preview-thumb">
                            <img src={item.preview} alt={item.file.name} />
                            <span className="merge-order-badge">
                              {index + 1}
                            </span>
                            <span className="merge-page-badge">
                              {item.pageCount}p
                            </span>
                          </div>
                          <div className="merge-preview-info">
                            <p className="merge-file-name">{item.file.name}</p>
                            <p className="merge-file-meta">
                              {item.pageCount} pages ·{" "}
                              {(item.file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <div className="merge-preview-actions">
                            <span className="drag-handle">⠿</span>
                            <button
                              className="remove-btn"
                              onClick={() => removeFile(item.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </>
      )}
    </ToolLayout>
  );
}
