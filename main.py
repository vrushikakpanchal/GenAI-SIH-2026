"""
FastAPI service exposing the Executive Summary & Briefing Engine.

Run with:
    uvicorn api.main:app --reload --port 8000

Endpoints:
    GET  /                    -> serves the demo dashboard
    POST /api/summarize/text  -> JSON in: {text, audience, tone, detail, language}
    POST /api/summarize/file  -> multipart file upload + form params
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Allow running as `uvicorn api.main:app` from the project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.pipeline import run_pipeline, run_pipeline_on_file  # noqa: E402

app = FastAPI(title="Executive Summary & Briefing Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


class TextRequest(BaseModel):
    text: str
    audience: str = "executive leadership"
    tone: str = "formal"
    detail: str = "concise"
    language: str = "English"


@app.get("/")
def serve_dashboard():
    index = FRONTEND_DIR / "index.html"
    if not index.exists():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return FileResponse(str(index))


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/summarize/text")
def summarize_text(req: TextRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")

    params = {
        "audience": req.audience,
        "tone": req.tone,
        "detail": req.detail,
        "language": req.language,
    }
    try:
        result = run_pipeline(req.text, params=params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result.to_dict()


@app.post("/api/summarize/file")
async def summarize_file(
    file: UploadFile = File(...),
    audience: str = Form("executive leadership"),
    tone: str = Form("formal"),
    detail: str = Form("concise"),
    language: str = Form("English"),
):
    suffix = Path(file.filename or "upload.txt").suffix or ".txt"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    params = {
        "audience": audience,
        "tone": tone,
        "detail": detail,
        "language": language,
    }
    try:
        result = run_pipeline_on_file(tmp_path, params=params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return result.to_dict()
