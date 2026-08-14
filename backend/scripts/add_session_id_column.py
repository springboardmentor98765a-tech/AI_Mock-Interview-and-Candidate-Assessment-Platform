"""
One-off migration: the opaque session_id on interviews.

Three steps, in this order, because the column is NOT NULL UNIQUE and the table
already has rows:

  1. add it nullable — an existing row has no value yet, so NOT NULL up front
     would be rejected outright
  2. backfill every existing row with its own UUID — one shared value would
     violate the unique index a moment later
  3. tighten to NOT NULL and add the unique index

    python -m scripts.add_session_id_column
"""

import uuid

from sqlalchemy import inspect, text

from app.db.session import engine

TABLE = "interviews"
COLUMN = "session_id"
INDEX = "ix_interviews_session_id"


def main() -> None:
    dialect = engine.dialect.name
    inspector = inspect(engine)

    if TABLE not in inspector.get_table_names():
        print(f"{TABLE} does not exist yet — start the app once to create it.")
        return

    existing = {column["name"] for column in inspector.get_columns(TABLE)}

    if COLUMN in existing:
        print(f"{TABLE}.{COLUMN}: already present")
    else:
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE {TABLE} ADD COLUMN {COLUMN} VARCHAR(36)"))
        print(f"{TABLE}.{COLUMN}: added")

    # Backfill row by row: every interview needs a *different* UUID, so this
    # cannot be one UPDATE with a single literal. gen_random_uuid() would do it
    # in one statement on Postgres, but generating them here keeps the SQLite
    # fallback on the same path.
    with engine.begin() as connection:
        rows = connection.execute(
            text(f"SELECT id FROM {TABLE} WHERE {COLUMN} IS NULL")
        ).fetchall()

        for (interview_id,) in rows:
            connection.execute(
                text(f"UPDATE {TABLE} SET {COLUMN} = :value WHERE id = :id"),
                {"value": str(uuid.uuid4()), "id": interview_id},
            )
        print(f"backfilled {len(rows)} existing interview(s)")

    indexes = {index["name"] for index in inspect(engine).get_indexes(TABLE)}
    with engine.begin() as connection:
        if INDEX in indexes:
            print(f"{INDEX}: already present")
        else:
            connection.execute(
                text(f"CREATE UNIQUE INDEX {INDEX} ON {TABLE} ({COLUMN})")
            )
            print(f"{INDEX}: created")

        if dialect == "postgresql":
            # SQLite cannot ALTER a column's nullability without rebuilding the
            # table; the ORM default fills the value on every insert either way,
            # so the constraint is a belt-and-braces measure on Postgres only.
            connection.execute(
                text(f"ALTER TABLE {TABLE} ALTER COLUMN {COLUMN} SET NOT NULL")
            )
            print(f"{TABLE}.{COLUMN}: set NOT NULL")
        else:
            print(f"{dialect}: leaving nullability as-is (no ALTER COLUMN support)")


if __name__ == "__main__":
    main()
