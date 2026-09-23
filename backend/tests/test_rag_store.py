import hashlib
import io
import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.services.rag.schema import ThreatIntelRecord
from app.services.rag.store import ThreatIntelVectorStore
import app.services.rag.store as rag_store_module


@pytest.fixture
def rag_store(monkeypatch):
    """Give the persistent RAG service a private SQLite database for each test."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr(rag_store_module, "SessionLocal", testing_session)
    try:
        yield ThreatIntelVectorStore()
    finally:
        Base.metadata.drop_all(bind=engine)


def test_nvd_streaming_ingestion_is_exact_and_idempotent(rag_store):
    payload = {
        "format": "NVD_CVE",
        "vulnerabilities": [
            {
                "cve": {
                    "id": "CVE-2026-44756",
                    "published": "2026-09-08T01:17:30.840",
                    "lastModified": "2026-09-08T19:12:59.557",
                    "descriptions": [{"lang": "en", "value": "SAP EPP processing memory corruption."}],
                    "metrics": {
                        "cvssMetricV31": [{"cvssData": {"baseScore": 10.0, "baseSeverity": "CRITICAL", "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"}}]
                    },
                    "weaknesses": [{"description": [{"lang": "en", "value": "CWE-120"}]}],
                    "references": [{"url": "https://example.test/CVE-2026-44756"}],
                    "affected": [{"affectedData": [{"vendor": "SAP_SE", "product": "SAP EPP", "versions": [{"version": "7.22", "status": "affected"}]}]}],
                }
            },
            {
                "cve": {
                    "id": "CVE-2026-447560",
                    "descriptions": [{"lang": "en", "value": "Different CVE with a shared prefix."}],
                }
            },
        ],
    }
    raw = json.dumps(payload).encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()

    first = rag_store.ingest_nvd_stream(io.BytesIO(raw), dataset_hash=digest, filename="nvd.json")
    second = rag_store.ingest_nvd_stream(io.BytesIO(raw), dataset_hash=digest, filename="nvd.json")

    assert first["count"] == 2
    assert second["already_ingested"] is True
    results = rag_store.query(cve_ids=["CVE-2026-44756"], top_k=5)
    assert [result.record.cve_id for result in results] == ["CVE-2026-44756"]
    assert results[0].record.cvss_score == "10.0"
    assert results[0].record.cwes == ["CWE-120"]


def test_cisa_and_cert_records_keep_distinct_provenance(rag_store):
    rag_store.bulk_add(
        [
            ThreatIntelRecord(
                id="nvd-CVE-2026-7273", source_name="NVD", source_type="NVD", document_type="CVE",
                cve_id="CVE-2026-7273", cve_ids=["CVE-2026-7273"], title="NVD record", summary="NVD technical record",
            ),
            ThreatIntelRecord(
                id="kev-CVE-2026-7273", source_name="CISA-KEV", source_type="CISA_KEV", document_type="KEV",
                cve_id="CVE-2026-7273", cve_ids=["CVE-2026-7273"], title="KEV record", summary="Known exploited",
            ),
            ThreatIntelRecord(
                id="cert-civn", source_name="CERT-In", source_type="CERT_IN", document_type="vulnerability_note",
                advisory_id="CIVN-2026-0467", cve_ids=["CVE-2026-7777"], title="ISC BIND note", summary="CERT-In note",
                affected_products=["ISC BIND"], mitigations=["Apply vendor updates"],
            ),
        ]
    )

    cve_results = rag_store.query(cve_ids=["CVE-2026-7273"], top_k=5)
    assert [(result.record.source_type, result.record.document_type) for result in cve_results] == [
        ("NVD", "CVE"),
        ("CISA_KEV", "KEV"),
    ]

    product_results = rag_store.query(products=["ISC BIND"], top_k=5)
    cert_result = next(result for result in product_results if result.record.advisory_id == "CIVN-2026-0467")
    assert cert_result.record.document_type == "vulnerability_note"
    assert cert_result.matched_by == "product_exact"


def test_exact_cve_does_not_add_unrelated_keyword_context(rag_store):
    rag_store.bulk_add(
        [
            ThreatIntelRecord(
                id="nvd-target", source_name="NVD", source_type="NVD", document_type="CVE",
                cve_id="CVE-2026-44756", cve_ids=["CVE-2026-44756"],
                title="SAP EPP memory safety vulnerability", summary="Target CVE record",
            ),
            ThreatIntelRecord(
                id="cert-target", source_name="CERT-In", source_type="CERT_IN", document_type="advisory",
                advisory_id="CIAD-2026-0045", cve_ids=["CVE-2026-44756"],
                title="SAP advisory", summary="Related CERT-In context",
            ),
            ThreatIntelRecord(
                id="nvd-unrelated", source_name="NVD", source_type="NVD", document_type="CVE",
                cve_id="CVE-2026-99999", cve_ids=["CVE-2026-99999"],
                title="Unrelated memory safety issue", summary="Unrelated security issue",
            ),
        ]
    )

    results = rag_store.query(
        cve_ids=["CVE-2026-44756"],
        products=["SAP EPP"],
        query_text="memory safety vulnerability in SAP EPP processing",
        top_k=5,
    )

    assert [result.record.id for result in results] == ["nvd-target", "cert-target"]
    assert all(result.matched_by == "cve_exact" for result in results)
