import pytest
import hashlib
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.organization import Organization, Team, TeamMembership
from app.models.user import User
from app.models.transformation import Transformation
from app.models.source import SourceDocument, LockedFact
from app.models.output import Output, OutputVersion
from app.models.review import Review, ReviewComment
from app.models.notification import Notification
from app.models.audit import AuditEvent
from app.models.integration import Integration
from app.models.template import AdvisoryTemplate
from app.models.rag import RagRecord, RagIngestion

@pytest.fixture
def db_session():
    """In-memory SQLite database session with foreign keys enabled for test isolation."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    # Enable SQLite foreign keys on the test connection
    with test_engine.connect() as conn:
        conn.exec_driver_sql("PRAGMA foreign_keys=ON;")
    
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)

def test_database_schema_and_all_tables_created(db_session):
    """Verify that all core tables are registered in the metadata and created properly."""
    inspector = inspect(db_session.bind)
    tables = inspector.get_table_names()
    
    expected_tables = [
        "organizations",
        "teams",
        "team_memberships",
        "users",
        "transformations",
        "source_documents",
        "locked_facts",
        "outputs",
        "output_versions",
        "reviews",
        "review_comments",
        "notifications",
        "audit_events",
        "integrations",
        "advisory_templates",
        "rag_records",
        "rag_ingestions",
    ]
    for table in expected_tables:
        assert table in tables, f"Expected table '{table}' was not created in database schema."

def test_organization_and_team_relationships(db_session):
    """Verify Organization, Team, and User relationships."""
    org = Organization(id="org-test", name="National Cyber Defense", domain="ncd.gov.in")
    db_session.add(org)
    db_session.commit()

    team = Team(id="team-alpha", org_id=org.id, name="CERT Response Team")
    user = User(
        id="u-analyst",
        org_id=org.id,
        name="Analyst One",
        email="analyst@ncd.gov.in",
        hashed_password="dummyhashedpwd",
        role="operator"
    )
    db_session.add_all([team, user])
    db_session.commit()

    membership = TeamMembership(team_id=team.id, user_id=user.id)
    db_session.add(membership)
    db_session.commit()

    # Query back
    fetched_org = db_session.query(Organization).filter_by(id="org-test").first()
    assert len(fetched_org.teams) == 1
    assert fetched_org.teams[0].name == "CERT Response Team"
    assert len(fetched_org.users) == 1
    assert fetched_org.users[0].email == "analyst@ncd.gov.in"

def test_transformation_locked_facts_and_cascade(db_session):
    """Verify Transformation, SourceDocument, and LockedFact cascade deletion."""
    org = Organization(id="org-tf", name="Cyber Org", domain="co.gov.in")
    user = User(
        id="u-op",
        org_id=org.id,
        name="Operator",
        email="op@co.gov.in",
        hashed_password="pw",
        role="operator"
    )
    db_session.add_all([org, user])
    db_session.commit()

    tr = Transformation(
        id="tr-100",
        code="TR-100",
        org_id=org.id,
        owner_id=user.id,
        status="draft",
        priority="high"
    )
    db_session.add(tr)
    db_session.commit()

    doc = SourceDocument(
        id="src-100",
        transformation_id=tr.id,
        filename="advisory.txt",
        file_type="TXT",
        raw_text="Vulnerability details",
        sanitized_text="Vulnerability details",
        content_hash="abc123hash",
        status="parsed"
    )
    fact = LockedFact(
        id="fact-100",
        transformation_id=tr.id,
        cve_ids=["CVE-2026-1000"],
        cvss_scores=["9.8"],
        severity="CRITICAL",
        ips=["192.0.2.1"],
        hashes=["deadbeef"],
        urls=["https://nvd.nist.gov"]
    )
    db_session.add_all([doc, fact])
    db_session.commit()

    # Check relation
    queried_tr = db_session.query(Transformation).filter_by(id="tr-100").first()
    assert queried_tr.locked_facts.cve_ids == ["CVE-2026-1000"]
    assert len(queried_tr.source_documents) == 1

    # Delete transformation -> LockedFact and SourceDocument must be cascade deleted
    db_session.delete(queried_tr)
    db_session.commit()

    assert db_session.query(LockedFact).filter_by(id="fact-100").first() is None
    assert db_session.query(SourceDocument).filter_by(id="src-100").first() is None

def test_output_and_version_integrity(db_session):
    """Verify Output and OutputVersion creation, content hashing, and version numbering."""
    org = Organization(id="org-out", name="Org Out", domain="out.gov.in")
    user = User(
        id="u-author",
        org_id=org.id,
        name="Author",
        email="author@out.gov.in",
        hashed_password="pw",
        role="operator"
    )
    tr = Transformation(id="tr-out", code="TR-OUT", org_id=org.id, owner_id=user.id)
    db_session.add_all([org, user, tr])
    db_session.commit()

    content_v1 = {"title": "Advisory v1", "severity": "HIGH"}
    hash_v1 = hashlib.sha256(str(content_v1).encode("utf-8")).hexdigest()

    output = Output(
        id="out-1",
        transformation_id=tr.id,
        output_type="SECURITY_ADVISORY",
        status="draft",
        version=1,
        content=content_v1,
        validation_status="valid"
    )
    db_session.add(output)
    db_session.commit()

    ver1 = OutputVersion(
        id="ver-1",
        output_id=output.id,
        version_num=1,
        content=content_v1,
        author_id=user.id,
        changelog="Initial generation",
        content_hash=hash_v1
    )
    db_session.add(ver1)
    db_session.commit()

    # Create v2
    content_v2 = {"title": "Advisory v2 updated", "severity": "CRITICAL"}
    hash_v2 = hashlib.sha256(str(content_v2).encode("utf-8")).hexdigest()
    output.version = 2
    output.content = content_v2
    ver2 = OutputVersion(
        id="ver-2",
        output_id=output.id,
        version_num=2,
        content=content_v2,
        author_id=user.id,
        changelog="Reviewed and updated severity",
        content_hash=hash_v2
    )
    db_session.add(ver2)
    db_session.commit()

    fetched_output = db_session.query(Output).filter_by(id="out-1").first()
    assert fetched_output.version == 2
    assert len(fetched_output.versions) == 2
    # Verify order (descending version_num)
    assert fetched_output.versions[0].version_num == 2
    assert fetched_output.versions[1].version_num == 1
    assert fetched_output.versions[0].content_hash == hash_v2

def test_advisory_template_model(db_session):
    """Verify configurable AdvisoryTemplate model support for global and org-specific templates."""
    org = Organization(id="org-tmpl", name="Custom Org", domain="cust.gov.in")
    db_session.add(org)
    db_session.commit()

    # System default template (org_id=None)
    default_tmpl = AdvisoryTemplate(
        id="tmpl-sys",
        org_id=None,
        name="Global Default Advisory",
        is_default=True,
        required_sections=["title", "severity", "cve_ids", "summary", "mitigation"],
        section_order=["header", "summary", "technical", "mitigation"],
        field_labels={"severity": "Risk Tier"},
        classification_tlp="TLP:CLEAR"
    )
    # Org specific template
    custom_tmpl = AdvisoryTemplate(
        id="tmpl-custom",
        org_id=org.id,
        name="Custom Operational Flash",
        is_default=False,
        required_sections=["title", "severity", "impact"],
        classification_tlp="TLP:AMBER"
    )
    db_session.add_all([default_tmpl, custom_tmpl])
    db_session.commit()

    # Query system default
    global_tmpl = db_session.query(AdvisoryTemplate).filter_by(is_default=True).first()
    assert global_tmpl.name == "Global Default Advisory"
    assert global_tmpl.org_id is None
    assert "Risk Tier" == global_tmpl.field_labels["severity"]

    # Query org templates
    org_tmpls = db_session.query(AdvisoryTemplate).filter_by(org_id=org.id).all()
    assert len(org_tmpls) == 1
    assert org_tmpls[0].classification_tlp == "TLP:AMBER"

def test_audit_event_logging(db_session):
    """Verify AuditEvent record creation and content tracking reference."""
    org = Organization(id="org-aud", name="Audit Org", domain="aud.gov.in")
    user = User(id="u-auditor", org_id=org.id, name="Auditor", email="aud@aud.gov.in", hashed_password="pw", role="operator")
    db_session.add_all([org, user])
    db_session.commit()

    event = AuditEvent(
        id="aud-1",
        actor_id=user.id,
        action="SOURCE_PARSED",
        target_type="transformation",
        target_id="tr-dummy",
        summary="Document parsed and 1 CVE locked",
        details={"cve_count": 1, "severity": "CRITICAL"},
        content_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )
    db_session.add(event)
    db_session.commit()

    saved_event = db_session.query(AuditEvent).filter_by(id="aud-1").first()
    assert saved_event.action == "SOURCE_PARSED"
    assert saved_event.actor.name == "Auditor"
    assert saved_event.content_hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
