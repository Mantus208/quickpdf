import { useState } from "react";
import MergePDF from "./tools/MergePDF";
import CompressPDF from "./tools/CompressPDF";
import SplitPDF from "./tools/SplitPDF";
import PDFtoJPG from "./tools/PDFtoJPG";
import JPGtoPDF from "./tools/JPGtoPDF";
import PageCounter from "./tools/PageCounter";
import Logo from "./components/Logo";
import "./App.css";

const tools = [
  {
    id: "merge",
    icon: "🔗",
    name: "Merge PDF",
    desc: "Combine multiple PDF files into one single document quickly and easily.",
    accent: "#6C3FF5",
    iconBg: "#f0ecff",
    tag: "Popular",
  },
  {
    id: "compress",
    icon: "📦",
    name: "Compress PDF",
    desc: "Reduce PDF file size while maintaining the best possible quality.",
    accent: "#00b894",
    iconBg: "#e6faf6",
    tag: "Popular",
  },
  {
    id: "split",
    icon: "✂️",
    name: "Split PDF",
    desc: "Separate one page or a whole set from your PDF file with ease.",
    accent: "#e17055",
    iconBg: "#fff3f0",
    tag: null,
  },
  {
    id: "pdf2jpg",
    icon: "🖼️",
    name: "PDF to JPG",
    desc: "Convert each PDF page into a JPG image quickly and easily.",
    accent: "#0984e3",
    iconBg: "#eaf4ff",
    tag: null,
  },
  {
    id: "jpg2pdf",
    icon: "📄",
    name: "JPG to PDF",
    desc: "Convert JPG images to PDF in seconds with high quality output.",
    accent: "#fd79a8",
    iconBg: "#fff0f6",
    tag: null,
  },
  {
    id: "counter",
    icon: "🔢",
    name: "PDF Page Counter",
    desc: "Count pages in single or multiple PDF files instantly.",
    accent: "#6C3FF5",
    iconBg: "#f0ecff",
    tag: "New",
  },
];

export default function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const renderTool = () => {
    switch (activeTool) {
      case "merge":
        return <MergePDF />;
      case "compress":
        return <CompressPDF />;
      case "split":
        return <SplitPDF />;
      case "pdf2jpg":
        return <PDFtoJPG />;
      case "jpg2pdf":
        return <JPGtoPDF />;
      case "counter":
        return <PageCounter />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo" onClick={() => setActiveTool(null)}>
          <Logo className="nav-logo-icon" />
          <span>QuickPDF</span>
        </div>
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          {tools.map((tool) => (
            <span
              key={tool.id}
              className="nav-link"
              onClick={() => {
                setActiveTool(tool.id);
                setMenuOpen(false);
              }}
            >
              {tool.name}
            </span>
          ))}
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
      </nav>

      {/* Hero */}
      {!activeTool && (
        <div className="hero">
          <h1>Every PDF Tool You Need</h1>
          <p>100% Free · Fast · Secure · No signup required</p>
        </div>
      )}

      {/* Tools Grid */}
      {!activeTool ? (
        <main className="grid">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="card"
              style={{ "--accent": tool.accent, "--icon-bg": tool.iconBg }}
              onClick={() => setActiveTool(tool.id)}
            >
              <div className="card-top">
                <div className="card-icon">{tool.icon}</div>
                {tool.tag && <span className="tag">{tool.tag}</span>}
              </div>
              <h2>{tool.name}</h2>
              <p>{tool.desc}</p>
              <span className="card-link">Use Tool →</span>
            </div>
          ))}
        </main>
      ) : (
        <main className="tool-page">
          <button className="back-btn" onClick={() => setActiveTool(null)}>
            ← Back to All Tools
          </button>
          {renderTool()}
        </main>
      )}

      <footer>
        <div className="footer-inner">
          <span>© 2026 QuickPDF — All rights reserved</span>

          <a
            href="https://arkasoft.in"
            target="_blank"
            rel="noopener noreferrer"
            className="powered-by"
          >
            <Logo className="footer-logo" />
            <span>Powered by ArkaSoft 🚀</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
