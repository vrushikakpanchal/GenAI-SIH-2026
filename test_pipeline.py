"""
Smoke test: verifies the full pipeline runs end-to-end on the sample report
with no network access and no API key required (offline extractive mode).

Run with: python -m pytest tests/ -v
or simply: python tests/test_pipeline.py
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Make sure no API key leaks in from the environment during this offline test
os.environ.pop("ANTHROPIC_API_KEY", None)

from app.pipeline import run_pipeline_on_file  # noqa: E402

SAMPLE = Path(__file__).resolve().parent.parent / "sample_data" / "sample_report.txt"


def test_pipeline_runs_offline():
    result = run_pipeline_on_file(str(SAMPLE), params={"detail": "concise"})

    assert result.num_chunks >= 1
    assert result.used_llm is False

    assert "# Executive Briefing" in result.briefing_markdown
    assert "## Key Risks" in result.briefing_markdown
    assert "## Recommended Decisions" in result.briefing_markdown

    consolidated = result.consolidated
    assert len(consolidated["risks"]) > 0, "Expected at least one risk to be extracted"
    assert len(consolidated["decisions"]) > 0, "Expected at least one decision to be extracted"

    print("\n--- Generated briefing ---\n")
    print(result.briefing_markdown)


if __name__ == "__main__":
    test_pipeline_runs_offline()
    print("\nOK: pipeline smoke test passed.")
