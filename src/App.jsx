import { useState } from "react";
import MergePDF from "./tools/MergePDF";
import CompressPDF from "./tools/CompressPDF";
import SplitPDF from "./tools/SplitPDF";
import PDFtoJPG from "./tools/PDFtoJPG";
import JPGtoPDF from "./tools/JPGtoPDF";
import PageCounter from "./tools/PageCounter";
import Logo from "./components/Logo";
import UnlockPDF from "./tools/UnlockPDF";
import EditPDF from "./tools/EditPDF";
import RotatePDF from "./tools/RotatePDF";
import PDFtoWord from "./tools/PDFtoWord";
import WatermarkPDF from "./tools/WatermarkPDF";
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
  {
    id: "unlock",
    icon: "🔓",
    name: "Unlock PDF",
    desc: "Remove password protection from PDF files instantly.",
    accent: "#f39c12",
    iconBg: "#fff9e6",
    tag: null,
  },
  {
    id: "editpdf",
    name: "Edit PDF",
    desc: "PDF mein text add karein, annotations dalein aur document ko modify karein.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    accent: "#00b4d8",
    iconBg: "rgba(0, 180, 216, 0.1)",
    tag: "New",
  },
  {
    id: "rotate",
    icon: "🔄",
    name: "Rotate PDF",
    desc: "Rotate individual pages or the whole document, 90° at a time.",
    accent: "#9b59b6",
    iconBg: "#f5edff",
    tag: "New",
  },
  {
    id: "pdf2word",
    icon: "📝",
    name: "PDF to Word",
    desc: "Convert PDF to editable Word document with formatting preserved.",
    accent: "#2980b9",
    iconBg: "#eaf4ff",
    tag: "New",
  },
  {
    id: "watermark",
    icon: "💧",
    name: "Add Watermark",
    desc: "Add custom text watermark to all pages of your PDF instantly.",
    accent: "#0984e3",
    iconBg: "#eaf4ff",
    tag: "New",
  },
];
const toolLayoutTools = [
  "merge",
  "compress",
  "split",
  "pdf2jpg",
  "jpg2pdf",
  "counter",
  "unlock",
  "editpdf",
  "rotate",
  "pdf2word",
  "watermark",
];
const getInitialTool = () => {
  const path = window.location.pathname.replace("/", "");
  const toolMap = {
    "merge-pdf": "merge",
    "compress-pdf": "compress",
    "split-pdf": "split",
    "pdf-to-jpg": "pdf2jpg",
    "jpg-to-pdf": "jpg2pdf",
    "pdf-page-counter": "counter",
    "unlock-pdf": "unlock",
    "edit-pdf": "editpdf",
    "rotate-pdf": "rotate",
    "pdf-to-word": "pdf2word",
    "watermark-pdf": "watermark",
  };
  return toolMap[path] || null;
};

export default function App() {
  // useEffect ki zaroorat khatam! Seedha URL se state set hogi
  const [activeTool, setActiveTool] = useState(getInitialTool);
  const [menuOpen, setMenuOpen] = useState(false);

  // URL aur Tool dono ek sath badalne ka function
  const handleToolSelect = (toolId) => {
    setActiveTool(toolId);
    setMenuOpen(false);

    const reverseMap = {
      merge: "merge-pdf",
      compress: "compress-pdf",
      split: "split-pdf",
      pdf2jpg: "pdf-to-jpg",
      jpg2pdf: "jpg-to-pdf",
      counter: "pdf-page-counter",
      unlock: "unlock-pdf",
      editpdf: "edit-pdf",
      rotate: "rotate-pdf",
      pdf2word: "pdf-to-word",
      watermark: "watermark-pdf",
    };

    if (toolId && reverseMap[toolId]) {
      window.history.pushState({}, "", `/${reverseMap[toolId]}`);
    } else {
      window.history.pushState({}, "", "/");
    }
  };

  const renderTool = () => {
    switch (activeTool) {
      case "merge":
        return <MergePDF onBack={() => handleToolSelect(null)} />;
      case "compress":
        return <CompressPDF onBack={() => handleToolSelect(null)} />;
      case "split":
        return <SplitPDF onBack={() => handleToolSelect(null)} />;
      case "pdf2jpg":
        return <PDFtoJPG onBack={() => handleToolSelect(null)} />;
      case "jpg2pdf":
        return <JPGtoPDF onBack={() => handleToolSelect(null)} />;
      case "counter":
        return <PageCounter onBack={() => handleToolSelect(null)} />;
      case "unlock":
        return <UnlockPDF onBack={() => handleToolSelect(null)} />;
      case "editpdf":
        return <EditPDF onBack={() => handleToolSelect(null)} />;
      case "rotate":
        return <RotatePDF onBack={() => handleToolSelect(null)} />;
      case "pdf2word":
        return <PDFtoWord onBack={() => handleToolSelect(null)} />;
      case "watermark":
        return <WatermarkPDF onBack={() => handleToolSelect(null)} />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo" onClick={() => handleToolSelect(null)}>
          <Logo className="nav-logo-icon" />
          <div
            style={{ fontSize: "24px", fontWeight: "700", color: "#1E293B" }}
          >
            PDF<span style={{ color: "#3B82F6" }}>Babu</span>
          </div>
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
      {/* Tools Grid */}{" "}
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
      ) : toolLayoutTools.includes(activeTool) ? (
        renderTool()
      ) : (
        <main className="tool-page">
          <button className="back-btn" onClick={() => handleToolSelect(null)}>
            ← Back to All Tools
          </button>
          {renderTool()}
        </main>
      )}
      <footer>
        <div className="footer-inner">
          <span>© 2026 PDFBabu — All rights reserved</span>

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
