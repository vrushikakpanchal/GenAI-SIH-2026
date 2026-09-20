# Executive Summary & Briefing Engine

Output/Feature 5 of the Gen AI Platform for Automated Content Transformation
(SIH PS 26154, NCIIPC/NTRO). Condenses dense, multi-page reports into a
structured executive briefing focused on **key risks, impact, and decisions**.

## What this is

A working reference implementation of the map-reduce briefing pipeline:

```
ingest -> chunk (by section) -> extract per chunk (map) -> aggregate (reduce) -> generate briefing
```

It runs in **two modes**, automatically:

- **Offline / extractive mode** (default, no setup required) — uses
  section-heading detection + TF-IDF sentence scoring + keyword heuristics.
  No model download, no API key, no internet access needed. This exists so
  the platform is demonstrably runnable in any judging/demo environment,
  including ones with restricted network access.
- **LLM mode** (optional, production-quality) — if `ANTHROPIC_API_KEY` is
  set in the environment, the same pipeline stages call the LLM instead for
  genuinely fluent, context-aware extraction and generation, with graceful
  fallback to offline mode on any API failure.

This dual-mode design is deliberate: it proves the architecture is sound
without depending on the demo machine having internet access or a paid key,
while remaining a one-environment-variable upgrade to full LLM quality.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Run the smoke test (fully offline, no key needed)

```bash
python tests/test_pipeline.py
```

### Run the API + dashboard

```bash
uvicorn api.main:app --reload --port 8000
```

Then open **http://localhost:8000** for the dashboard, or call the API directly:

```bash
curl -X POST http://localhost:8000/api/summarize/text \
  -H "Content-Type: application/json" \
  -d '{"text": "...report text...", "audience": "executive leadership", "detail": "concise"}'
```

File upload (PDF/DOCX/TXT):

```bash
curl -X POST http://localhost:8000/api/summarize/file \
  -F "file=@sample_data/sample_report.txt" \
  -F "audience=board of directors" \
  -F "detail=detailed"
```

### Enable LLM mode (optional, recommended for production quality)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-sonnet-4-5"   # or your preferred available model
uvicorn api.main:app --reload --port 8000
```

No code changes needed — `app/llm_client.py` auto-detects the key and the
pipeline switches modes per-request.

## Project structure

```
exec-summary-engine/
  app/
    ingestion.py      # txt/pdf/docx -> clean text
    chunking.py        # section-aware splitting for long documents
    extraction.py        # per-chunk structured extraction (map step)
    aggregation.py         # merge + dedupe across chunks (reduce step)
    generation.py            # final briefing generation from structured data
    llm_client.py              # optional Anthropic API wrapper
    pipeline.py                  # orchestrates the full flow
  api/
    main.py            # FastAPI endpoints + dashboard serving
  frontend/
    index.html         # minimal operator dashboard
  sample_data/
    sample_report.txt  # demo input
  tests/
    test_pipeline.py   # offline end-to-end smoke test
```

## Design choices worth noting (for the architecture doc)

1. **Generation reads from structured extracts, not raw text.** The final
   briefing is generated from the consolidated `{facts, risks, impacts,
   decisions}` object, not by re-feeding the whole raw document into one
   call. This is what keeps output traceable to specific source statements
   and avoids the dropped-risk / hallucinated-impact failure mode that
   single-shot summarization of long documents is prone to.

2. **Section headings are used as a structural signal**, not just chunk
   boundaries. In `extraction.py`, when a chunk comes from a section headed
   "Impact Assessment" (or similar), impact-category matching is given
   priority over risk-category matching for that chunk's sentences. Report
   sections routinely use overlapping vocabulary (e.g. an impact statement
   containing the word "breach"), so pure keyword matching without this
   structural bias systematically misclassifies content — worth calling out
   explicitly as a known limitation of any purely lexical approach.

3. **The offline extractive path is intentionally simple** (TF-IDF sentence
   scoring + keyword matching, no external model). It is a functional
   fallback proving the pipeline architecture, not a claim of
   state-of-the-art summarization quality. Production quality is expected
   to come from the LLM path.

## Roadmap / not yet implemented

- **Domain fine-tuning**: `ccdv/govreport-summarization` and
  `FiscalNote/billsum` (Hugging Face) are reasonable starting corpora for
  fine-tuning a dedicated summarization model (e.g. LongT5, LED, or
  Pegasus) if a self-hosted model is preferred over an LLM API in
  production — not attempted here since Hugging Face model/dataset hosts
  are not reachable from every build/demo environment, and prompting a
  general-purpose LLM already covers the "condense + extract key
  risks/impact/decisions" task well.
- **Multilingual output**: the `language` parameter is accepted and passed
  through; non-English generation currently requires LLM mode (or a
  translation API such as Bhashini) — the offline path notes this limitation
  inline rather than silently producing English output unlabeled.
- **Human-in-the-loop review gate**: given the sensitivity of source content
  in this problem statement's context (advisories, incident reports), a
  production deployment should route generated briefings through a review
  step before publication, especially in LLM mode. Not implemented here
  since it's a workflow/policy feature, not a modeling one.
