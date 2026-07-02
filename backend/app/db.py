import os
from urllib.parse import unquote

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")


class Base(DeclarativeBase):
    pass


_engine = None
_SessionLocal = None


def _build_url() -> URL:
    """Parse DATABASE_URL manually.

    Uses rsplit on '@' so passwords containing '@' are handled correctly.
    Also handles Supabase pooler URLs where usernames contain dots.
    """
    raw = DATABASE_URL
    if "://" in raw:
        scheme, rest = raw.split("://", 1)
        if "@" in rest:
            userinfo, hostpart = rest.rsplit("@", 1)
            if ":" in userinfo:
                username, password = userinfo.split(":", 1)
            else:
                username, password = userinfo, ""
            username = unquote(username)
            password = unquote(password)
            if "/" in hostpart:
                hostport, database = hostpart.split("/", 1)
            else:
                hostport, database = hostpart, ""
            if ":" in hostport:
                host, port = hostport.rsplit(":", 1)
            else:
                host, port = hostport, None

            return URL.create(
                drivername="postgresql+psycopg",
                username=username,
                password=password,
                host=host,
                port=int(port) if port else None,
                database=database,
            )
    return URL.create("postgresql+psycopg")


def _get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(
            _build_url(),
            connect_args={
                "sslmode": "require",
                "prepare_threshold": None,  # disable prepared statements for PgBouncer compat
            },
        )
    return _engine


def get_db():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=_get_engine()
        )
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
