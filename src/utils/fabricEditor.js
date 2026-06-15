import { Canvas, StaticCanvas, IText, Rect, Circle, FabricImage } from "fabric";

let fabricCanvas = null;
let historyStack = [];
let redoStack = [];
let isRestoring = false;
let historyCallback = null;

const MAX_HISTORY = 40;

export function initializeFabric(canvasEl, width, height, onHistoryChange) {
  if (fabricCanvas) {
    fabricCanvas.dispose();
  }

  fabricCanvas = new Canvas(canvasEl, {
    width,
    height,
    selection: true,
  });

  historyStack = [];
  redoStack = [];
  historyCallback = onHistoryChange;

  saveHistory();

  fabricCanvas.on("object:added", saveHistory);
  fabricCanvas.on("object:modified", saveHistory);
  fabricCanvas.on("object:removed", saveHistory);

  document.addEventListener("keydown", handleKeyDown);

  return fabricCanvas;
}

export function disposeFabric() {
  document.removeEventListener("keydown", handleKeyDown);
  if (fabricCanvas) {
    fabricCanvas.dispose();
    fabricCanvas = null;
  }
}

function handleKeyDown(e) {
  if (!fabricCanvas) return;
  const active = fabricCanvas.getActiveObject();
  if (!active) return;
  if (active.isEditing) return; // text type karte waqt delete na ho

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    deleteSelected();
  }
}

function saveHistory() {
  if (isRestoring || !fabricCanvas) return;
  const json = JSON.stringify(fabricCanvas.toJSON());
  historyStack.push(json);
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
  redoStack = [];
  notifyHistory();
}

function notifyHistory() {
  if (historyCallback) {
    historyCallback({
      canUndo: historyStack.length > 1,
      canRedo: redoStack.length > 0,
    });
  }
}

export function undo() {
  if (!fabricCanvas || historyStack.length <= 1) return;
  const current = historyStack.pop();
  redoStack.push(current);
  const prev = historyStack[historyStack.length - 1];
  restoreState(prev);
}

export function redo() {
  if (!fabricCanvas || redoStack.length === 0) return;
  const next = redoStack.pop();
  historyStack.push(next);
  restoreState(next);
}

function restoreState(json) {
  if (!fabricCanvas) return;
  isRestoring = true;
  fabricCanvas.loadFromJSON(JSON.parse(json)).then(() => {
    fabricCanvas.renderAll();
    isRestoring = false;
    notifyHistory();
  });
}

// ---- Add Tools ----

export function addText(text = "Double-click to edit") {
  if (!fabricCanvas) return;
  const itext = new IText(text, {
    left: 60,
    top: 60,
    fontSize: 20,
    fill: "#1a1040",
    fontFamily: "Segoe UI, sans-serif",
  });
  fabricCanvas.add(itext);
  fabricCanvas.setActiveObject(itext);
  fabricCanvas.renderAll();
}

export function addRectangle() {
  if (!fabricCanvas) return;
  const rect = new Rect({
    left: 60,
    top: 60,
    width: 140,
    height: 90,
    fill: "rgba(108,63,245,0.15)",
    stroke: "#6C3FF5",
    strokeWidth: 2,
  });
  fabricCanvas.add(rect);
  fabricCanvas.setActiveObject(rect);
  fabricCanvas.renderAll();
}

export function addCircle() {
  if (!fabricCanvas) return;
  const circle = new Circle({
    left: 60,
    top: 60,
    radius: 50,
    fill: "rgba(231,112,85,0.15)",
    stroke: "#e17055",
    strokeWidth: 2,
  });
  fabricCanvas.add(circle);
  fabricCanvas.setActiveObject(circle);
  fabricCanvas.renderAll();
}

export function addImage(file) {
  if (!fabricCanvas || !file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    FabricImage.fromURL(e.target.result).then((img) => {
      img.scaleToWidth(150);
      img.set({ left: 60, top: 60 });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
    });
  };
  reader.readAsDataURL(file);
}

export function deleteSelected() {
  if (!fabricCanvas) return;
  const active = fabricCanvas.getActiveObject();
  if (!active) return;

  if (active.type === "activeselection") {
    active.forEachObject((obj) => fabricCanvas.remove(obj));
    fabricCanvas.discardActiveObject();
  } else {
    fabricCanvas.remove(active);
  }
  fabricCanvas.renderAll();
}

// ---- Page switch / Save helpers ----

export function getCanvasJSON() {
  if (!fabricCanvas) return null;
  return JSON.stringify(fabricCanvas.toJSON());
}

export function loadCanvasJSON(json) {
  if (!fabricCanvas) return;
  isRestoring = true;
  if (json) {
    fabricCanvas.loadFromJSON(JSON.parse(json)).then(() => {
      fabricCanvas.renderAll();
      isRestoring = false;
    });
  } else {
    fabricCanvas.clear();
    isRestoring = false;
  }
}

// Save PDF ke time — sirf annotations ko offscreen render karo
export async function renderAnnotationsToCanvas(json, width, height) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = width;
  canvasEl.height = height;
  const staticCanvas = new StaticCanvas(canvasEl, { width, height });

  if (json) {
    await staticCanvas.loadFromJSON(JSON.parse(json));
    staticCanvas.renderAll();
  }
  return canvasEl;
}
