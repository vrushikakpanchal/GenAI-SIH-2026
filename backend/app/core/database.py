from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Resolve relative sqlite paths against BASE_DIR to prevent cwd-dependent failures
    if not ":memory:" in db_url:
        path_str = db_url.replace("sqlite:///", "", 1)
        p = Path(path_str)
        if not p.is_absolute():
            abs_p = (settings.BASE_DIR / p).resolve()
            abs_p.parent.mkdir(parents=True, exist_ok=True)
            db_url = f"sqlite:///{abs_p.as_posix()}"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False,
)

# Enable SQLite foreign keys & WAL mode for high concurrency
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
