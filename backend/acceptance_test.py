import httpx
import json

BASE_URL = "http://127.0.0.1:8000/api"

def run_acceptance_test():
    print("--- STEP 1: Login as Operator ---")
    resp = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "ishita@sentinel.local",
        "password": "Operator123!"
    })
    if resp.status_code != 200:
        print("Login failed:", resp.status_code, resp.text)
        exit(1)

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Login successful. Token acquired.")

    print("\n--- STEP 2: Create Transformation ---")
    resp = httpx.post(f"{BASE_URL}/transformations", json={
        "config": {
            "audience": "Security Operations",
            "tone": "Formal",
            "detail": 80,
            "objective": "Alert"
        },
        "priority": "high"
    }, headers=headers)
    if resp.status_code != 200:
        print("Create transformation failed:", resp.status_code, resp.text)
        exit(1)

    tr_data = resp.json()
    tr_id = tr_data["id"]
    tr_code = tr_data["code"]
    print(f"[OK] Transformation created: ID={tr_id}, Code={tr_code}")

    print("\n--- STEP 3: Ingest Source Input Document ---")
    report_text = """
SECURITY INCIDENT REPORT - CRITICAL ADVISORY
Date: 2026-09-02
Vulnerability Identifier: CVE-2026-82329
Affected Software: JFrog Artifactory Self-Managed
Affected Versions: Prior to 7.90.10
Severity Rating: CRITICAL (CVSS v3.1 Score 9.8)

Description:
An authentication bypass vulnerability has been identified in JFrog Artifactory Self-Managed. Under default configuration, an unauthenticated remote attacker can gain administrative privileges over network access.

Action Required / Remediation:
Upgrade JFrog Artifactory Self-Managed to version 7.90.10 or later immediately in accordance with vendor guidelines and CISA BOD 26-04 directives.

References:
https://nvd.nist.gov/vuln/detail/CVE-2026-82329
https://docs.jfrog.com/releases/docs/jfrog-security-advisories
"""

    resp = httpx.post(f"{BASE_URL}/transformations/{tr_id}/source/paste", json={
        "title": "JFrog Artifactory Threat Report",
        "filename": "jfrog_advisory.txt",
        "text": report_text
    }, headers=headers)
    if resp.status_code != 200:
        print("Paste source failed:", resp.status_code, resp.text)
        exit(1)
    print(f"[OK] Source report ingested into transformation {tr_code}.")

    print("\n--- STEP 4: Inspect Extracted Locked Facts ---")
    resp = httpx.get(f"{BASE_URL}/transformations/{tr_id}/facts", headers=headers)
    if resp.status_code != 200:
        print("Get facts failed:", resp.status_code, resp.text)
        exit(1)
    facts = resp.json()
    print("Locked Facts:", json.dumps(facts, indent=2))

    print("\n--- STEP 5: Trigger RAG Retrieval + Ollama (gpt-oss:120b-cloud) Advisory Generation ---")
    print("Requesting POST /api/transformations/{id}/generate...")
    resp = httpx.post(f"{BASE_URL}/transformations/{tr_id}/generate", headers=headers, timeout=180.0)
    if resp.status_code != 200:
        print("Generation failed:", resp.status_code, resp.text)
        exit(1)

    output_data = resp.json()
    output_id = output_data["id"]
    print(f"[OK] Generation completed! Output ID: {output_id}")

    print("\n--- STEP 6: Inspect Retrieved RAG Evidence & Validation Details ---")
    metadata = output_data.get("metadata_json", {})
    validation_details = output_data.get("validation_details", {})
    rag_evidence = metadata.get("rag_retrieval", [])

    print("Validation Status:", output_data.get("validation_status"))
    print("Model Used:", metadata.get("model"))
    print("\nRetrieved Dataset Evidence:")
    print(json.dumps(rag_evidence, indent=2))

    print("\n--- STEP 7: Inspect Persisted Structured Advisory Output ---")
    content = output_data.get("content", {})
    print(json.dumps(content, indent=2))

    print("\n--- STEP 8: Verify DB Persistence via GET /api/outputs/{id} ---")
    resp = httpx.get(f"{BASE_URL}/outputs/{output_id}", headers=headers, timeout=180.0)
    if resp.status_code != 200:
        print("Fetch output failed:", resp.status_code, resp.text)
        exit(1)
    print("[OK] Output successfully verified from database persistence.")

    print("\n==========================================")
    print("ACCEPTANCE TEST SUCCESSFULLY COMPLETED!")
    print("==========================================")


if __name__ == "__main__":
    run_acceptance_test()
