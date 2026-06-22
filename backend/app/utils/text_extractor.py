import io


async def extract_text(filename: str, content: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("txt", "md", "csv", "json", "xml", "html", "py", "js", "ts"):
        return content.decode("utf-8", errors="replace")

    if ext == "pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n\n".join(p for p in pages if p.strip())
        except ImportError:
            return "[PDF parsing requires: pip install pypdf]"
        except Exception as e:
            return f"[PDF read error: {e}]"

    if ext == "docx":
        try:
            from docx import Document as DocxDoc
            doc = DocxDoc(io.BytesIO(content))
            return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except ImportError:
            return "[DOCX parsing requires: pip install python-docx]"
        except Exception as e:
            return f"[DOCX read error: {e}]"

    # Fallback: try decoding as UTF-8 text
    try:
        return content.decode("utf-8", errors="replace")
    except Exception:
        return "[Unsupported file type]"
