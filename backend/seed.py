import sys
import hashlib
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
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

def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def seed_db():
    print("[*] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_org = db.query(Organization).first()
        if existing_org:
            existing_tmpl = db.query(AdvisoryTemplate).first()
            if not existing_tmpl:
                print("[*] Seeding missing advisory templates...")
                db.add_all([
                    AdvisoryTemplate(
                        id="tmpl-default",
                        org_id=None,
                        name="Standard Security Advisory (Default)",
                        description="Comprehensive standardized format suitable for operational teams, CERT advisories, and technical disclosure.",
                        is_default=True,
                        required_sections=[
                            "title", "severity", "cve_ids", "summary",
                            "affected_products", "technical_details", "mitigation", "references"
                        ],
                        optional_sections=[
                            "cvss", "affected_versions", "impact", "exploitation_status",
                            "indicators", "recommendations", "classification"
                        ],
                        section_order=[
                            "header", "metadata", "executive_summary", "affected_systems",
                            "technical_details", "impact", "indicators_of_compromise",
                            "mitigation", "recommendations", "references"
                        ],
                        field_labels={
                            "title": "Advisory Title",
                            "severity": "Severity Rating",
                            "cvss": "CVSS v3.1 Score",
                            "indicators": "Indicators of Compromise (IOCs)",
                            "technical_details": "Technical Vulnerability Analysis"
                        },
                        branding={
                            "header": "CYBERSECURITY ADVISORY BULLETIN",
                            "logo_text": "SENTINEL NCCC",
                            "footer_notice": "Authoritative advisory generated via verified technical source locking."
                        },
                        required_reference_links=["https://cve.mitre.org", "https://nvd.nist.gov"],
                        disclaimers="Information provided without warranty. Organizations must evaluate mitigations in lab before production deployment.",
                        classification_tlp="TLP:CLEAR"
                    ),
                    AdvisoryTemplate(
                        id="tmpl-executive",
                        org_id=existing_org.id,
                        name="High-Impact Incident Advisory",
                        description="Executive and incident commander format emphasizing immediate operational impact and defensive directives.",
                        is_default=False,
                        required_sections=[
                            "title", "severity", "summary", "impact", "mitigation"
                        ],
                        optional_sections=[
                            "cve_ids", "technical_details", "indicators", "recommendations"
                        ],
                        section_order=[
                            "header", "executive_summary", "impact", "mitigation", "recommendations", "references"
                        ],
                        field_labels={
                            "title": "Incident Summary",
                            "severity": "Threat Urgency",
                            "impact": "Mission / Operational Impact",
                            "mitigation": "Immediate Action Required"
                        },
                        branding={
                            "header": "URGENT THREAT DIRECTIVE",
                            "logo_text": "NCCC EXECUTIVE BRIEF"
                        },
                        disclaimers="Distribution limited to authorized executive leadership and primary incident coordinators.",
                        classification_tlp="TLP:AMBER"
                    )
                ])
                db.commit()
                print("[+] Missing advisory templates seeded successfully.")
            else:
                print("[+] Database already fully seeded. Skipping re-seed.")
            return

        print("[*] Seeding organization and teams...")
        org = Organization(
            id="org-1",
            name="National Cyber Coordination Centre",
            domain="nccc.gov.in"
        )
        db.add(org)
        db.flush()

        team_ti = Team(
            id="t-ti",
            org_id=org.id,
            name="Threat Intelligence",
            description="Active threat monitoring, triage, and source fact verification."
        )
        team_soc = Team(
            id="t-soc",
            org_id=org.id,
            name="Security Operations",
            description="SOC response, perimeter telemetry, and defensive rules."
        )
        team_ra = Team(
            id="t-ra",
            org_id=org.id,
            name="Review & Advisory",
            description="Editorial review, factual validation, and authorized distribution."
        )
        db.add_all([team_ti, team_soc, team_ra])
        db.flush()

        print("[*] Seeding users with secure password hashing...")
        user_ishita = User(
            id="u-ishita",
            org_id=org.id,
            name="Ishita Roy",
            email="ishita@sentinel.local",
            hashed_password=get_password_hash("Operator123!"),
            role="operator",
            title="Senior Threat Analyst",
            initials="IR",
            status="active"
        )
        user_rahul = User(
            id="u-rahul",
            org_id=org.id,
            name="Rahul Sharma",
            email="rahul@sentinel.local",
            hashed_password=get_password_hash("Reviewer123!"),
            role="reviewer",
            title="Lead Security Reviewer",
            initials="RS",
            status="active"
        )
        user_admin = User(
            id="u-admin",
            org_id=org.id,
            name="System Admin",
            email="admin@sentinel.local",
            hashed_password=get_password_hash("Admin123!"),
            role="admin",
            title="Organization Administrator",
            initials="SA",
            status="active"
        )
        user_ananya = User(
            id="u-ananya",
            org_id=org.id,
            name="Ananya Patel",
            email="ananya@sentinel.local",
            hashed_password=get_password_hash("Viewer123!"),
            role="viewer",
            title="Security Auditor",
            initials="AP",
            status="active"
        )
        db.add_all([user_ishita, user_rahul, user_admin, user_ananya])
        db.flush()

        # Memberships
        db.add_all([
            TeamMembership(team_id=team_ti.id, user_id=user_ishita.id),
            TeamMembership(team_id=team_ra.id, user_id=user_rahul.id),
            TeamMembership(team_id=team_ti.id, user_id=user_admin.id),
            TeamMembership(team_id=team_soc.id, user_id=user_ananya.id),
        ])

        # Production seed data deliberately contains users, workflow setup, and
        # templates only. Security advisories are created solely by the real
        # source -> fact lock -> RAG -> Qwen generation pipeline.

        # Integrations
        db.add_all([
            Integration(
                id="int-drive",
                org_id=org.id,
                name="Google Drive",
                category="storage",
                status="not_connected",
                account=None,
                permissions=["read", "write"]
            ),
            Integration(
                id="int-linkedin",
                org_id=org.id,
                name="LinkedIn",
                category="publishing",
                status="not_connected",
                account=None,
                permissions=["w_member_social"]
            ),
            Integration(
                id="int-x",
                org_id=org.id,
                name="X (Twitter)",
                category="publishing",
                status="not_connected",
                account=None,
                permissions=["tweet.write"]
            )
        ])

        print("[*] Seeding default configurable advisory templates...")
        db.add_all([
            AdvisoryTemplate(
                id="tmpl-default",
                org_id=None,
                name="Standard Security Advisory (Default)",
                description="Comprehensive standardized format suitable for operational teams, CERT advisories, and technical disclosure.",
                is_default=True,
                required_sections=[
                    "title", "severity", "cve_ids", "summary",
                    "affected_products", "technical_details", "mitigation", "references"
                ],
                optional_sections=[
                    "cvss", "affected_versions", "impact", "exploitation_status",
                    "indicators", "recommendations", "classification"
                ],
                section_order=[
                    "header", "metadata", "executive_summary", "affected_systems",
                    "technical_details", "impact", "indicators_of_compromise",
                    "mitigation", "recommendations", "references"
                ],
                field_labels={
                    "title": "Advisory Title",
                    "severity": "Severity Rating",
                    "cvss": "CVSS v3.1 Score",
                    "indicators": "Indicators of Compromise (IOCs)",
                    "technical_details": "Technical Vulnerability Analysis"
                },
                branding={
                    "header": "CYBERSECURITY ADVISORY BULLETIN",
                    "logo_text": "SENTINEL NCCC",
                    "footer_notice": "Authoritative advisory generated via verified technical source locking."
                },
                required_reference_links=["https://cve.mitre.org", "https://nvd.nist.gov"],
                disclaimers="Information provided without warranty. Organizations must evaluate mitigations in lab before production deployment.",
                classification_tlp="TLP:CLEAR"
            ),
            AdvisoryTemplate(
                id="tmpl-executive",
                org_id=org.id,
                name="High-Impact Incident Advisory",
                description="Executive and incident commander format emphasizing immediate operational impact and defensive directives.",
                is_default=False,
                required_sections=[
                    "title", "severity", "summary", "impact", "mitigation"
                ],
                optional_sections=[
                    "cve_ids", "technical_details", "indicators", "recommendations"
                ],
                section_order=[
                    "header", "executive_summary", "impact", "mitigation", "recommendations", "references"
                ],
                field_labels={
                    "title": "Incident Summary",
                    "severity": "Threat Urgency",
                    "impact": "Mission / Operational Impact",
                    "mitigation": "Immediate Action Required"
                },
                branding={
                    "header": "URGENT THREAT DIRECTIVE",
                    "logo_text": "NCCC EXECUTIVE BRIEF"
                },
                disclaimers="Distribution limited to authorized executive leadership and primary incident coordinators.",
                classification_tlp="TLP:AMBER"
            )
        ])

        db.commit()
        print("[+] Database seeded successfully with users, organizations, integrations, and templates.")
    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
