import pytest
from models.interview import InterviewQuestion, InterviewSession
from services.interview_service import _evaluate_answer_fallback, evaluate_session_answers

def test_evaluation_pipeline_correctness_levels():
    """
    Verifies evaluation logic against 5 distinct answer categories:
    1. Clearly correct
    2. Partially correct
    3. Clearly incorrect
    4. Irrelevant (off-topic)
    5. Unanswered
    """
    q1 = InterviewQuestion(
        id=101, sequence_no=1, category="Technical", difficulty="Medium",
        question_text="What is FastAPI?",
        expected_answer="FastAPI is a modern high-performance web framework for building APIs with Python based on standard Python type hints.",
        evaluation_points=["Python web framework", "High performance", "Type hints", "ASGI OpenAPI"]
    )
    q2 = InterviewQuestion(
        id=102, sequence_no=2, category="Technical", difficulty="Medium",
        question_text="How does GIL work in Python?",
        expected_answer="The Global Interpreter Lock (GIL) is a mutex that allows only one thread to hold the control of the Python interpreter at any given time.",
        evaluation_points=["Mutex lock", "Single thread execution", "CPython interpreter control"]
    )
    q3 = InterviewQuestion(
        id=103, sequence_no=3, category="Technical", difficulty="Medium",
        question_text="Explain database indexing in SQL.",
        expected_answer="Database indexes are B-tree data structures that improve the speed of data retrieval operations on a table at the cost of additional writes.",
        evaluation_points=["Data structure", "Query speed optimization", "B-tree index scan"]
    )
    q4 = InterviewQuestion(
        id=104, sequence_no=4, category="Technical", difficulty="Medium",
        question_text="What is dependency injection?",
        expected_answer="Dependency injection is a design pattern where an object receives its dependencies from external sources rather than creating them internally.",
        evaluation_points=["Design pattern", "Decoupling dependencies", "Inversion of control"]
    )
    q5 = InterviewQuestion(
        id=105, sequence_no=5, category="Technical", difficulty="Medium",
        question_text="How do you handle background tasks in Python?",
        expected_answer="Background tasks can be handled using Celery workers, Asyncio task queues, or background tasks in frameworks like FastAPI.",
        evaluation_points=["Task queue", "Asynchronous execution", "Worker process"]
    )

    # 1. Clearly correct answer
    ans1 = _evaluate_answer_fallback(q1, "FastAPI is a modern high performance Python web framework based on type hints and OpenAPI standard.")
    assert ans1["correctness"] == "Correct"
    assert ans1["score"] >= 85.0

    # 2. Partially correct answer
    ans2 = _evaluate_answer_fallback(q2, "GIL is a lock in Python for threads.")
    assert ans2["correctness"] in ["Partially Correct", "Correct"]
    assert ans2["score"] >= 50.0

    # 3. Clearly incorrect answer
    ans3 = _evaluate_answer_fallback(q3, "Database indexing means running a select query without any table index.")
    assert ans3["correctness"] in ["Incorrect", "Partially Correct"]
    assert ans3["score"] <= 55.0

    # 4. Irrelevant answer
    ans4 = _evaluate_answer_fallback(q4, "I like eating bananas and watching movies on weekends.")
    assert ans4["correctness"] == "Irrelevant"
    assert ans4["score"] <= 15.0

    # 5. Unanswered question
    ans5 = _evaluate_answer_fallback(q5, "No response provided.")
    assert ans5["correctness"] == "Unanswered"
    assert ans5["score"] == 0.0
