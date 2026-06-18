export default function ToolLayout({
  title,
  icon,
  children,
  sidebar,
  actionBtn,
  onBack,
}) {
  return (
    <div className="tool-layout">
      <div className="tool-layout-header">
        {onBack && (
          <button
            className="back-btn"
            onClick={onBack}
            style={{ marginBottom: "0.8rem" }}
          >
            ← Back to All Tools
          </button>
        )}
        <h2>
          {icon} {title}
        </h2>
      </div>

      <div className="tool-layout-body">
        <div className="tool-layout-main">{children}</div>

        <div className="tool-layout-sidebar">
          <div className="sidebar-content">{sidebar}</div>

          {actionBtn && <div className="sidebar-action">{actionBtn}</div>}
        </div>
      </div>
    </div>
  );
}
