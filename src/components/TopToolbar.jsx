export default function TopToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  currentPage,
  numPages,
  onUploadNew,
}) {
  return (
    <div className="top-toolbar">
      <div className="toolbar-left">
        <span className="page-indicator">
          Page {currentPage} / {numPages}
        </span>
      </div>

      <div className="toolbar-center">
        <button className="zoom-btn" onClick={onZoomOut}>
          −
        </button>
        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
        <button className="zoom-btn" onClick={onZoomIn}>
          +
        </button>
      </div>

      <div className="toolbar-right">
        <label className="upload-new-btn">
          ⬆️ Upload New
          <input type="file" accept=".pdf" onChange={onUploadNew} hidden />
        </label>
      </div>
    </div>
  );
}
