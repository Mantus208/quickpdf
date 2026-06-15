export default function ToolsPanel({
  addText,
  addRectangle,
  addCircle,
  addImage,
  deleteSelected,
  undo,
  redo,
  canUndo,
  canRedo,
}) {
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) addImage(file);
    e.target.value = "";
  };

  return (
    <aside className="tools-panel">
      <h3>🛠️ Tools</h3>

      <button className="tool-btn" onClick={() => addText()}>
        <span className="tool-icon">🔤</span> Add Text
      </button>

      <label className="tool-btn file-tool-btn">
        <span className="tool-icon">🖼️</span> Add Image
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          hidden
        />
      </label>

      <button className="tool-btn" onClick={addRectangle}>
        <span className="tool-icon">▭</span> Rectangle
      </button>

      <button className="tool-btn" onClick={addCircle}>
        <span className="tool-icon">◯</span> Circle
      </button>

      <button className="tool-btn danger" onClick={deleteSelected}>
        <span className="tool-icon">🗑️</span> Delete Selected
      </button>

      <div className="tool-divider"></div>

      <div className="undo-redo-row">
        <button className="tool-btn small" onClick={undo} disabled={!canUndo}>
          ↩️ Undo
        </button>
        <button className="tool-btn small" onClick={redo} disabled={!canRedo}>
          ↪️ Redo
        </button>
      </div>

      <div className="tool-tip">
        💡 <b>Tip:</b> Text par double-click karo edit karne ke liye. Object
        select karo aur Delete key dabao remove karne ke liye.
      </div>
    </aside>
  );
}
