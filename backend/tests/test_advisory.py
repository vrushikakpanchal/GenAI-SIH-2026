import pytest
import json
from app.schemas.output import SecurityAdvisorySchema
from app.models.source import LockedFact
from app.modules.advisory.validator import AdvisoryValidator
from app.modules.advisory.generator import AdvisoryGenerator
from app.services.ai.ollama_client import OllamaClient

class MockOllamaClient(OllamaClient):
    """Mock client used STRICTLY in automated unit tests."""
    def __init__(self, response_json_str: str):
        super().__init__()
        self.response_json_str = response_json_str

    async def generate_completion(self, system_prompt: str, user_prompt: str, json_format: bool = True) -> str:
        return self.response_json_str

@pytest.mark.asyncio
async def test_advisory_schema_and_fact_validation_clean():
    locked_fact = LockedFact(
        cve_ids=["CVE-2026-8812"],
        cvss_scores=["9.8"],
        severity="CRITICAL",
        ips=["198.51.100.45"],
        hashes=["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
        urls=["https://nvd.nist.gov/vuln/detail/CVE-2026-8812"],
        domains=["threat-intel.net"]
    )

    mock_json = json.dumps({
        "title": "Critical RCE in Apache Struts 2",
        "severity": "CRITICAL",
        "cve_ids": ["CVE-2026-8812"],
        "cvss": "9.8",
        "affected_products": ["Apache Struts 2"],
        "affected_versions": ["2.5.0 - 2.5.33"],
        "summary": "High risk flaw in multi-part request parsing.",
        "technical_details": "OGNL evaluation allows arbitrary commands.",
        "impact": "Full system takeover.",
        "indicators": [
            "198.51.100.45",
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        ],
        "mitigation": "Upgrade to 2.5.34.",
        "recommendations": ["Apply patch immediately."],
        "references": ["https://nvd.nist.gov/vuln/detail/CVE-2026-8812"]
    })

    generator = AdvisoryGenerator(client=MockOllamaClient(mock_json))
    advisory, report = await generator.generate_advisory(
        source_text="Sample text",
        locked_fact=locked_fact,
        config={}
    )

    assert advisory.title == "Critical RCE in Apache Struts 2"
    assert advisory.cve_ids == ["CVE-2026-8812"]
    assert report["status"] == "valid"
    assert report["has_discrepancies"] is False
    assert len(report["unverified_cves"]) == 0

@pytest.mark.asyncio
async def test_advisory_fact_validation_discrepancy_flagging():
    locked_fact = LockedFact(
        cve_ids=["CVE-2026-8812"],
        ips=["198.51.100.45"],
        hashes=[]
    )

    # Model hallucinates a CVE-2026-99999 and rogue IP 10.99.88.77
    hallucinated_advisory = SecurityAdvisorySchema(
        title="Flaw with fabricated CVE",
        severity="HIGH",
        cve_ids=["CVE-2026-8812", "CVE-2026-99999"],
        cvss="8.0",
        affected_products=["Product X"],
        affected_versions=["1.0"],
        summary="Summary",
        technical_details="Details",
        impact="Impact",
        indicators=["198.51.100.45", "10.99.88.77"],
        mitigation="Mitigation",
        recommendations=["Rec"],
        references=[]
    )

    report = AdvisoryValidator.validate_against_locked_facts(hallucinated_advisory, locked_fact)
    assert report["status"] == "discrepancies_flagged"
    assert report["has_discrepancies"] is True
    assert "CVE-2026-99999" in report["unverified_cves"]
    assert "10.99.88.77" in report["unverified_ips"]
    assert len(report["findings"]) >= 2
