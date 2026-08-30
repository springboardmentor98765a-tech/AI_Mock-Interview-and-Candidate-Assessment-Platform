"""
One-off migration: add Interview.behavior_report (Module 6).

The app creates tables with Base.metadata.create_all, which builds missing
tables but never alters existing ones. A database created before Module 6
existed therefore needs this column added by hand — this script does that,
and is safe to run more than once.

    python -m scripts.add_interview_behavior_report_column
"""

from sqlalchemy import inspect, text

from app.db.session import engine

TABLE = "interviews"
COLUMN = "behavior_report"
SQL_TYPE = {"postgresql": "JSON", "sqlite": "TEXT"}


def main() -> None:
    dialect = engine.dialect.name
    inspector = inspect(engine)

    if TABLE not in inspector.get_table_names():
        print(f"{TABLE} does not exist yet — start the app once to create it.")
        return

    existing = {column["name"] for column in inspector.get_columns(TABLE)}
    if COLUMN in existing:
        print(f"{TABLE}.{COLUMN}: already present")
        return

    sql_type = SQL_TYPE.get(dialect, SQL_TYPE["sqlite"])
    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE {TABLE} ADD COLUMN {COLUMN} {sql_type}"))
    print(f"{TABLE}.{COLUMN}: added ({sql_type})")


if __name__ == "__main__":
    main()
