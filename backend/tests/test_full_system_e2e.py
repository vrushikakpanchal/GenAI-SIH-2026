import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.transformation import Transformation
from app.models.source import SourceDocument, LockedFact
from app.models.output import Output, OutputVersion
from app.core.database import SessionLocal

client = TestClient(app)

@pytest.fixture(scope="module")
def operator_token():
    resp = client.post("/api/auth/login", json={"email": "ishita@sentinel.local", "password": "Operator123!"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def reviewer_token():
    resp = client.post("/api/auth/login", json={"email": "rahul@sentinel.local", "password": "Reviewer123!"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]

def test_source_upload_and_deterministic_fact_locking(operator_token):
    headers = {"Authorization": f"Bearer {operator_token}"}
    
    # 1. Create a transformation
    tr_resp = client.post(
        "/api/transformations",
        headers=headers,
        json={
            "priority": "high",
            "config": {
                "audience": "Security Operations",
                "tone": "Formal",
                "outputTypes": ["advisory"]
            }
        }
    )
    assert tr_resp.status_code == 200, tr_resp.text
    tr_data = tr_resp.json()
    tr_id = tr_data["id"]

    # 2. Upload source report
    synthetic_report = (
        "INCIDENT REPORT: On 2026-09-20, internal honeypots detected brute-force attempts.\n"
        "Attacker IP: 198.51.100.42 was attempting unauthorized authentication on SSH port 22.\n"
        "A malicious payload was dropped with SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.\n"
        "Affected systems: Apache HTTP Server 2.4.50 and OpenSSL 1.1.1k.\n"
        "Vulnerability identified: CVE-2021-41773 with CVSS 7.5 HIGH.\n"
        "Recommended action: Update Apache to 2.4.51 and block IP 198.51.100.42.\n"
    )

    file_bytes = synthetic_report.encode("utf-8")
    files = {"file": ("incident_2026.txt", io.BytesIO(file_bytes), "text/plain")}

    upload_resp = client.post(
        f"/api/transformations/{tr_id}/source/upload",
        headers=headers,
        files=files
    )
    assert upload_resp.status_code == 200, upload_resp.text
    doc_data = upload_resp.json()
    assert doc_data["filename"] == "incident_2026.txt"
    assert doc_data["status"] == "parsed"
    assert len(doc_data["content_hash"]) == 64

    # 3. Verify deterministic facts locked
    facts_resp = client.get(f"/api/transformations/{tr_id}/facts", headers=headers)
    assert facts_resp.status_code == 200
    facts = facts_resp.json()

    assert "CVE-2021-41773" in facts["cve_ids"]
    assert "198.51.100.42" in facts["ips"]
    assert "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" in facts["hashes"]
    assert facts["severity"] in ["HIGH", "CRITICAL"]

def test_pdf_export_and_versioning(operator_token):
    headers = {"Authorization": f"Bearer {operator_token}"}
    
    # 1. Create a transformation & direct advisory output for testing PDF export
    tr_resp = client.post("/api/transformations", headers=headers, json={"priority": "high"})
    tr_id = tr_resp.json()["id"]

    db = SessionLocal()
    output = Output(
        transformation_id=tr_id,
        output_type="SECURITY_ADVISORY",
        status="draft",
        version=1,
        content={
            "title": "Apache HTTP Server Path Traversal and File Disclosure",
            "severity": "HIGH",
            "cve_ids": ["CVE-2021-41773"],
            "cvss": "7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)",
            "affected_products": ["Apache HTTP Server"],
            "affected_versions": ["2.4.49", "2.4.50"],
            "summary": "A path traversal flaw was identified in Apache HTTP Server.",
            "technical_details": "A flaw was found in a change made to path normalization in Apache.",
            "impact": "Unauthenticated attackers could map URLs to files outside expected root.",
            "indicators": ["198.51.100.42"],
            "mitigation": "Immediately upgrade Apache HTTP Server to version 2.4.51 or higher.",
            "recommendations": ["Audit access logs for traversal attempts.", "Ensure proper filesystem permissions."],
            "references": ["https://httpd.apache.org/security/vulnerabilities_24.html"]
        },
        validation_status="valid",
        review_status="not_submitted",
        created_by="user-ishita"
    )
    db.add(output)
    db.commit()
    db.refresh(output)
    output_id = output.id
    db.close()

    # 2. Test ReportLab PDF Export
    pdf_resp = client.get(f"/api/outputs/{output_id}/pdf", headers=headers)
    assert pdf_resp.status_code == 200, pdf_resp.text
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF")
    assert len(pdf_resp.content) > 1000

    # 3. Test Edit & Version increment
    edit_resp = client.patch(
        f"/api/outputs/{output_id}",
        headers=headers,
        json={
            "content": {
                "title": "Apache HTTP Server Path Traversal (REVISED)",
                "severity": "HIGH",
                "cve_ids": ["CVE-2021-41773"],
                "cvss": "7.5",
                "affected_products": ["Apache HTTP Server"],
                "affected_versions": ["2.4.49", "2.4.50"],
                "summary": "Revised operational summary for security operations center.",
                "technical_details": "Detailed mechanics updated by senior operator.",
                "impact": "Data confidentiality threat.",
                "indicators": ["198.51.100.42"],
                "mitigation": "Upgrade to Apache 2.4.51.",
                "recommendations": ["Apply immediate patch."],
                "references": []
            },
            "changelog": "Operator updated technical summary"
        }
    )
    assert edit_resp.status_code == 200, edit_resp.text
    updated = edit_resp.json()
    assert updated["version"] == 2
    assert updated["content"]["title"] == "Apache HTTP Server Path Traversal (REVISED)"

    # 4. List versions
    v_resp = client.get(f"/api/outputs/{output_id}/versions", headers=headers)
    assert v_resp.status_code == 200
    v_list = v_resp.json()
    assert len(v_list) >= 1
    assert any(v["version_num"] == 2 for v in v_list)

def test_review_workflow_and_rbac(operator_token, reviewer_token):
    op_headers = {"Authorization": f"Bearer {operator_token}"}
    rev_headers = {"Authorization": f"Bearer {reviewer_token}"}

    # 1. Create transformation and output
    tr_resp = client.post("/api/transformations", headers=op_headers, json={"priority": "high"})
    tr_id = tr_resp.json()["id"]

    db = SessionLocal()
    output = Output(
        transformation_id=tr_id,
        output_type="SECURITY_ADVISORY",
        status="draft",
        version=1,
        content={"title": "Review Workflow Test", "severity": "MEDIUM"},
        validation_status="valid",
        review_status="not_submitted",
        created_by="user-ishita"
    )
    db.add(output)
    db.commit()
    db.refresh(output)
    output_id = output.id
    db.close()

    # 2. Operator submits for review
    sub_resp = client.post(f"/api/outputs/{output_id}/submit-review", headers=op_headers)
    assert sub_resp.status_code == 200, sub_resp.text
    assert sub_resp.json()["status"] == "awaiting_review"

    # 3. Reviewer adds comment
    com_resp = client.post(
        f"/api/outputs/{output_id}/comments",
        headers=rev_headers,
        json={"comment": "Please verify mitigation section before final signoff."}
    )
    assert com_resp.status_code == 200
    assert com_resp.json()["comment"] == "Please verify mitigation section before final signoff."

    # 4. Reviewer requests changes
    chg_resp = client.post(
        f"/api/outputs/{output_id}/request-changes",
        headers=rev_headers,
        json={"comment": "Clarify recommended Apache version."}
    )
    assert chg_resp.status_code == 200
    assert chg_resp.json()["status"] == "changes_requested"

    # 5. Operator resubmits
    resub_resp = client.post(f"/api/outputs/{output_id}/resubmit", headers=op_headers)
    assert resub_resp.status_code == 200
    assert resub_resp.json()["status"] == "awaiting_review"

    # 6. Reviewer approves
    app_resp = client.post(f"/api/outputs/{output_id}/approve", headers=rev_headers)
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "approved"

def test_rag_dataset_ingest_and_retrieval(operator_token):
    headers = {"Authorization": f"Bearer {operator_token}"}

    # 1. Ingest sample CISA KEV JSON
    cisa_sample = {
        "title": "CISA Known Exploited Vulnerabilities Catalog",
        "vulnerabilities": [
            {
                "cveID": "CVE-2023-38606",
                "vendorProject": "Apple",
                "product": "iOS and macOS",
                "vulnerabilityName": "Apple Multiple Products Memory Corruption Vulnerability",
                "shortDescription": "A vulnerability in the kernel allows malicious apps to modify sensitive kernel state.",
                "requiredAction": "Apply vendor updates per advisory.",
                "notes": "https://support.apple.com/en-us/HT213841"
            }
        ]
    }
    sample_bytes = json_str = str(cisa_sample).replace("'", '"').encode("utf-8")
    files = {"file": ("cisa_kev_sample.json", io.BytesIO(sample_bytes), "application/json")}
    
    ingest_resp = client.post("/api/rag/ingest", headers=headers, files=files)
    assert ingest_resp.status_code == 200, ingest_resp.text
    assert ingest_resp.json()["count"] >= 1

    # 2. Check stats
    stats_resp = client.get("/api/rag/stats", headers=headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_records"] >= 1
    assert stats["indexed_cves"] >= 1

    # 3. Query threat intel by exact CVE
    query_resp = client.post(
        "/api/rag/query",
        headers=headers,
        json={"cve_ids": ["CVE-2023-38606"], "top_k": 3}
    )
    assert query_resp.status_code == 200
    q_data = query_resp.json()
    assert q_data["count"] >= 1
    match = q_data["results"][0]
    assert match["cve_id"] == "CVE-2023-38606"
    assert match["matched_by"] == "cve_exact"
