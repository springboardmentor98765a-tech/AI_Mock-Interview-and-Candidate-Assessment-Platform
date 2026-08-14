"""
One-off migration: the PAUSED session status and the session timing columns.

Two different kinds of change here, and the enum one is the awkward half.

`status` is a native Postgres enum type, so a new member is not a column change
— it is `ALTER TYPE ... ADD VALUE` on the type itself. Postgres will not let a
newly added enum value be *used* in the same transaction that added it, so this
runs on an AUTOCOMMIT connection rather than inside SQLAlchemy's usual
transaction. On SQLite the status is stored as plain text and there is no type
to alter, so that step is skipped entirely.

    python -m scripts.add_session_pause_columns
"""

from sqlalchemy import inspect, text

from app.db.session import engine

TABLE = "interviews"
COLUMNS = {
    "paused_at": {"postgresql": "TIMESTAMP WITH TIME ZONE", "sqlite": "TIMESTAMP"},
    "total_paused_seconds": {
        "postgresql": "INTEGER NOT NULL DEFAULT 0",
        "sqlite": "INTEGER NOT NULL DEFAULT 0",
    },
    # Stamped when an interview ends. Nullable: an interview that is still
    # running has no duration, and a default of 0 would claim it took no time.
    "duration_seconds": {"postgresql": "INTEGER", "sqlite": "INTEGER"},
}

ENUM_TYPE = "sessionstatus"
NEW_VALUE = "PAUSED"


def _add_enum_value() -> None:
    """Add PAUSED to the Postgres enum, once, without failing on a re-run."""
    # AUTOCOMMIT from the outset: the isolation level cannot be changed once a
    # transaction has begun, and the lookup below would begin one implicitly.
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        existing = connection.execute(
            text(
                "SELECT 1 FROM pg_enum e "
                "JOIN pg_type t ON t.oid = e.enumtypid "
                "WHERE t.typname = :type AND e.enumlabel = :value"
            ),
            {"type": ENUM_TYPE, "value": NEW_VALUE},
        ).first()

        if existing:
            print(f"{ENUM_TYPE}.{NEW_VALUE}: already present")
            return

        connection.execute(text(f"ALTER TYPE {ENUM_TYPE} ADD VALUE '{NEW_VALUE}'"))
        print(f"{ENUM_TYPE}.{NEW_VALUE}: added")


def main() -> None:
    dialect = engine.dialect.name
    inspector = inspect(engine)

    if TABLE not in inspector.get_table_names():
        print(f"{TABLE} does not exist yet — start the app once to create it.")
        return

    if dialect == "postgresql":
        _add_enum_value()
    else:
        print(f"{dialect}: status is stored as text, no enum to alter")

    existing = {column["name"] for column in inspector.get_columns(TABLE)}
    with engine.begin() as connection:
        for name, per_dialect in COLUMNS.items():
            if name in existing:
                print(f"{TABLE}.{name}: already present")
                continue
            sql_type = per_dialect.get(dialect, per_dialect["sqlite"])
            connection.execute(text(f"ALTER TABLE {TABLE} ADD COLUMN {name} {sql_type}"))
            print(f"{TABLE}.{name}: added ({sql_type})")


if __name__ == "__main__":
    main()
