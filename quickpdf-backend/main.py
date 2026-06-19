import fitz
import base64
import io
import json
import uuid
import os
import tempfile
from fastapi import BackgroundTasks, FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pdf2docx import Converter
from docx import Document as DocxDocument
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"status": "PDFBabu Backend is running! 🚀"}


@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    pages_data = []

    for page_num in range(len(doc)):
        page = doc[page_num]

        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_bytes = pix.tobytes("png")
        img_base64 = base64.b64encode(img_bytes).decode("utf-8")

        text_blocks = []
        blocks = page.get_text("dict")["blocks"]

        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    if not span["text"].strip():
                        continue

                    text_blocks.append({
                        "text": span["text"],
                        "x": span["bbox"][0],
                        "y": span["bbox"][1],
                        "width": span["bbox"][2] - span["bbox"][0],
                        "height": span["bbox"][3] - span["bbox"][1],
                        "origin_x": span["origin"][0],
                        "origin_y": span["origin"][1],
                        "font_size": span["size"],
                        "font": span["font"],
                        "color": span["color"],
                    })

        pages_data.append({
            "page_number": page_num + 1,
            "width": page.rect.width,
            "height": page.rect.height,
            "image": f"data:image/png;base64,{img_base64}",
            "text_blocks": text_blocks,
        })

    doc.close()

    return {
        "total_pages": len(pages_data),
        "pages": pages_data,
    }


@app.post("/save")
async def save_pdf(
    file: UploadFile = File(...),
    edits: str = Form(...),
):
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    edits_list = json.loads(edits)

    for edit in edits_list:
        page = doc[edit["page"] - 1]

        padding = 1
        rect = fitz.Rect(
            edit["x"] + padding,
            edit["y"] + padding,
            edit["x"] + edit["width"] - padding,
            edit["y"] + edit["height"] - padding,
        )

        page.add_redact_annot(rect, fill=None)
        page.apply_redactions(graphics=False)

        color_int = edit.get("color", 0)
        r = ((color_int >> 16) & 255) / 255
        g = ((color_int >> 8) & 255) / 255
        b = (color_int & 255) / 255

        font_size = edit.get("font_size", 11)
        original_font = edit.get("font", "")
        original_font_lower = original_font.lower()

        is_bold = (
            original_font_lower.endswith("bold") or
            original_font_lower.endswith("boldmt") or
            "-bold" in original_font_lower or
            ",bold" in original_font_lower or
            "bold" == original_font_lower
        )
        is_italic = (
            "italic" in original_font_lower or
            "oblique" in original_font_lower
        )

        if is_bold and is_italic:
            fontname = "hebi"
        elif is_bold:
            fontname = "hebo"
        elif is_italic:
            fontname = "heit"
        else:
            fontname = "helv"

        origin_x = edit.get("origin_x", edit["x"])
        origin_y = edit.get("origin_y", edit["y"] + font_size * 0.8)

        text_point = fitz.Point(origin_x, origin_y)

        page.insert_text(
            text_point,
            edit["new_text"],
            fontsize=font_size,
            color=(r, g, b),
            fontname=fontname,
            render_mode=0,
        )

    output_buffer = io.BytesIO()
    doc.save(output_buffer)
    doc.close()
    output_buffer.seek(0)

    return StreamingResponse(
        output_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=edited.pdf"},
    )


def cleanup_temp_files(*paths):
    for path in paths:
        try:
            if path and os.path.exists(path):
                os.remove(path)
                print(f"[CLEANUP] Deleted {path}")
        except Exception as e:
            print(f"[CLEANUP ERROR] {str(e)}")


@app.post("/pdf-to-word")
def pdf_to_word(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    uid = str(uuid.uuid4())[:8]
    original_name = file.filename.replace(".pdf", "")
    temp_dir = tempfile.gettempdir()

    temp_pdf = os.path.join(temp_dir, f"temp_{uid}.pdf")
    temp_docx = os.path.join(temp_dir, f"{uid}.docx")
    temp_fixed = os.path.join(temp_dir, f"{uid}_fixed.docx")

    try:
        with open(temp_pdf, "wb") as f:
            f.write(file.file.read())

        cv = Converter(temp_pdf)
        cv.convert(temp_docx, start=0, end=None)
        cv.close()

        if not os.path.exists(temp_docx):
            raise Exception("DOCX file not created!")

        doc = DocxDocument(temp_docx)
        settings = doc.settings.element
        compat = OxmlElement('w:compat')
        compat_mode = OxmlElement('w:compatSetting')
        compat_mode.set(qn('w:name'), 'compatibilityMode')
        compat_mode.set(qn('w:uri'), 'http://schemas.microsoft.com/office/word')
        compat_mode.set(qn('w:val'), '12')
        compat.append(compat_mode)
        settings.append(compat)
        doc.save(temp_fixed)

        background_tasks.add_task(
            cleanup_temp_files,
            temp_pdf,
            temp_docx,
            temp_fixed
        )

        return FileResponse(
            path=temp_fixed,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"{original_name}_by_PDFBabu.docx"
        )

    except Exception as e:
        cleanup_temp_files(temp_pdf, temp_docx, temp_fixed)
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
