import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Provide a real Postgres/Supabase connection "
        "string via environment variable — never hardcode credentials."
    )

# Supabase/Supavisor connection strings may use postgres:// scheme;
# SQLAlchemy 2.x requires postgresql://
_url = DATABASE_URL
if _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql://", 1)

# For Supabase pooler (port 6543) SSL is required; for direct (port 5432) it
# may be optional. We honour whatever is already in the URL and add
# sslmode=require only when it is not already present.
_connect_args: dict = {}
if "sslmode" not in _url and "supabase" in _url:
    _connect_args["sslmode"] = "require"

engine = create_engine(
    _url,
    pool_pre_ping=True,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
