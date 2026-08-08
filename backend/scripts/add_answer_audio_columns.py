"""
One-off migration: add the answer-recording and skip columns to
interview_questions.

The app creates tables with Base.metadata.create_all, which builds missing
tables but never alters existing ones. A database created before spoken answers
were stored as audio therefore needs these two columns added by hand — this
script does that, and is safe to run more than once.

    python -m scripts.add_answer_audio_columns
"""

from sqlalchemy import inspect, text

from app.db.session import engine

TABLE = "interview_questions"
COLUMNS = {
    "answer_audio_path": "VARCHAR(512)",
    "answer_audio_mime": "VARCHAR(80)",
    "skipped_at": "TIMESTAMP WITH TIME ZONE",
}


def main() -> None:
    inspector = inspect(engine)
    if TABLE not in inspector.get_table_names():
        print(f"{TABLE} does not exist yet — start the app once to create it.")
        return

    existing = {column["name"] for column in inspector.get_columns(TABLE)}

    with engine.begin() as connection:
        for name, sql_type in COLUMNS.items():
            if name in existing:
                print(f"{name}: already present")
                continue
            connection.execute(text(f"ALTER TABLE {TABLE} ADD COLUMN {name} {sql_type}"))
            print(f"{name}: added")


if __name__ == "__main__":
    main()
