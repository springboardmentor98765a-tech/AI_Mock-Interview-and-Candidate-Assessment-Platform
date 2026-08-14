"""
One-off migration: session video recordings and the playback access log.

`Base.metadata.create_all` at startup builds missing tables, so a fresh
database gets these on the next boot without help. This script exists for a
database that is already running and should not be restarted, and to make the
change explicit alongside the other migrations.

    python -m scripts.add_recording_tables
"""

from sqlalchemy import inspect

from app.db.session import Base, engine

# Importing registers the tables on the shared metadata. The referenced tables
# have to be imported too — a foreign key cannot be resolved against metadata
# that has never seen `interviews` or `users`.
from app.models import interview as interview_model  # noqa: F401
from app.models import recording as recording_model  # noqa: F401
from app.models import user as user_model  # noqa: F401

TABLES = ("interview_recordings", "recording_accesses")


def main() -> None:
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())

    missing = [name for name in TABLES if name not in existing]
    for name in TABLES:
        print(f"{name}: {'already present' if name in existing else 'creating'}")

    if not missing:
        return

    # checkfirst leaves anything already there untouched, so this is safe to
    # re-run and safe against a partially applied earlier attempt.
    Base.metadata.create_all(
        bind=engine,
        tables=[Base.metadata.tables[name] for name in missing],
        checkfirst=True,
    )
    print(f"created: {', '.join(missing)}")


if __name__ == "__main__":
    main()
