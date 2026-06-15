import { useEffect, useState } from "react";

export default function PagesPanel({
  pdfDoc,
  numPages,
  currentPage,
  onPageSelect,
  onUpload,
}) {
  const [thumbnails, setThumbnails] = useState([]);

  useEffect(() => {
    async function generateThumbs() {
      if (!pdfDoc) {
        setThumbnails([]);
        return;
      }
      const thumbs = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        thumbs.push(canvas.toDataURL("image/jpeg", 0.6));
      }
      setThumbnails(thumbs);
    }
    generateThumbs();
  }, [pdfDoc, numPages]);

  return (
    <aside className="pages-panel">
      <h3>📄 Pages</h3>

      <label className="upload-pdf-btn">
        📂 {pdfDoc ? "Upload New PDF" : "Select PDF File"}
        <input type="file" accept=".pdf" onChange={onUpload} hidden />
      </label>

      <div className="pages-list">
        {thumbnails.map((thumb, i) => (
          <div
            key={i}
            className={`page-thumb ${currentPage === i + 1 ? "active" : ""}`}
            onClick={() => onPageSelect(i + 1)}
          >
            <img src={thumb} alt={`Page ${i + 1}`} />
            <span className="page-number">{i + 1}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
