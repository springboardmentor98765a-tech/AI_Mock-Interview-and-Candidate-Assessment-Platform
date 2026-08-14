"""
One-off migration for Modules 4 and 5: per-question timing and speech analysis.

The app creates tables with Base.metadata.create_all, which builds missing
tables but never alters existing ones. A database created before the timed
workflow and communication analysis existed therefore needs these columns
added by hand — this script does that, and is safe to run more than once.

    python -m scripts.add_session_analysis_columns
"""

from sqlalchemy import inspect, text

from app.db.session import engine

# JSON is spelled differently per backend, and the app supports both Postgres
# and the SQLite fallback. SQLite has no JSON column type — it stores JSON in a
# TEXT column — so asking for JSON there would fail.
JSON_TYPE = {"postgresql": "JSONB", "sqlite": "TEXT"}

TABLES = {
    "interviews": {
        "question_seconds": "INTEGER",
    },
    "interview_questions": {
        "answer_duration_seconds": "DOUBLE PRECISION",
        "analysis": "__json__",
        "analyzed_at": "TIMESTAMP WITH TIME ZONE",
    },
}

# SQLite spells these differently too, and silently accepts unknown type names
# rather than erroring — which would leave a column with no usable affinity.
SQLITE_TYPES = {
    "DOUBLE PRECISION": "REAL",
    "TIMESTAMP WITH TIME ZONE": "TIMESTAMP",
}


def _sql_type(declared: str, dialect: str) -> str:
    if declared == "__json__":
        return JSON_TYPE.get(dialect, "TEXT")
    if dialect == "sqlite":
        return SQLITE_TYPES.get(declared, declared)
    return declared


def main() -> None:
    dialect = engine.dialect.name
    inspector = inspect(engine)
    present = set(inspector.get_table_names())

    with engine.begin() as connection:
        for table, columns in TABLES.items():
            if table not in present:
                print(f"{table}: does not exist yet — start the app once to create it.")
                continue

            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, declared in columns.items():
                if name in existing:
                    print(f"{table}.{name}: already present")
                    continue
                sql_type = _sql_type(declared, dialect)
                connection.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}")
                )
                print(f"{table}.{name}: added ({sql_type})")


if __name__ == "__main__":
    main()
