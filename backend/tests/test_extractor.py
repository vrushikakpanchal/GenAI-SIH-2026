import pytest
from app.modules.advisory.extractor import FactExtractor
from app.services.source_parser import SourceParser

SAMPLE_SECURITY_TEXT = """
INCIDENT ALERT: CRITICAL APACHE STRUTS VULNERABILITY
Ref: CVE-2026-9914, CVE-2026-8812
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H (Score: 9.8)
Severity: CRITICAL

Affected Product: Apache Struts Framework
Affected Versions: 2.5.0 to 2.5.32

Observed Ingress Attacks:
Target Web App: https://portal.internal-defense.gov/upload
Attacker IP: 198.51.100.14
C2 Server: 203.0.113.99
Malware Hash: b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9

Reporter contact: security-ops@contractor-firm.com
"""

def test_deterministic_fact_extractor():
    facts = FactExtractor.extract_facts(SAMPLE_SECURITY_TEXT)
    
    # 1. Strongly structured identifiers
    assert "CVE-2026-9914" in facts["cve_ids"]
    assert "CVE-2026-8812" in facts["cve_ids"]
    assert facts["severity"] == "CRITICAL"
    assert "198.51.100.14" in facts["ips"]
    assert "203.0.113.99" in facts["ips"]
    assert "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9" in facts["hashes"]
    assert any("https://portal.internal-defense.gov/upload" in u for u in facts["urls"])
    
    # 2. Candidate product and versions (preserves uncertainty)
    assert any("Apache Struts" in p["name"] for p in facts["candidate_products"])
    assert facts["candidate_products"][0]["confidence"] == "candidate"

    # 3. DLP finding
    assert any(f["type"] == "personal_email" and f["value"] == "security-ops@contractor-firm.com" for f in facts["dlp_findings"])

def test_source_parser_sanitization_and_untrusted_delimiters():
    raw_text = "Sample test \x00 with null byte and alert."
    sanitized = SourceParser.sanitize_text(raw_text)
    assert "\x00" not in sanitized
    
    wrapped = SourceParser.wrap_untrusted_prompt(sanitized)
    assert wrapped.startswith("<UNTRUSTED_SOURCE>")
    assert wrapped.endswith("</UNTRUSTED_SOURCE>")
