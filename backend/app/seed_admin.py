"""Seed one admin user from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars."""
import os

from dotenv import load_dotenv

load_dotenv()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")


def seed_admin():
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("ADMIN_EMAIL and ADMIN_PASSWORD must be set")
        return

    from app.core.security import hash_password
    from app.db import _get_engine
    from app.models.user import User, UserRole
    from sqlalchemy.orm import Session

    engine = _get_engine()
    with Session(engine) as session:
        existing = session.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            print(f"Admin '{ADMIN_EMAIL}' already exists — skipping")
            return

        admin = User(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            role=UserRole.admin,
        )
        session.add(admin)
        session.commit()
        print(f"Admin '{ADMIN_EMAIL}' created successfully")


if __name__ == "__main__":
    seed_admin()
