"""
Unit tests for the coding-practice judge engine (app/judge.py).

These run the real judge against real subprocesses (Python is always
available in CI), so they double as a smoke test that the judge's
sandboxing/timeout/scoring logic actually works end-to-end — not just
mocked function calls.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.judge import _normalize, run_submission


def test_normalize_strips_trailing_whitespace_and_blank_lines():
    assert _normalize("5\n") == ["5"]
    assert _normalize("5") == ["5"]
    assert _normalize("5 \n\n") == ["5"]
    assert _normalize("line1\r\nline2\r\n") == ["line1", "line2"]


def test_run_submission_python_all_pass():
    code = "a, b = map(int, input().split())\nprint(a + b)\n"
    test_cases = [
        {"input": "2 3", "expected_output": "5"},
        {"input": "10 20", "expected_output": "30"},
    ]
    result = run_submission("python", code, test_cases)
    assert result.compiled is True
    assert result.total_count == 2
    assert result.passed_count == 2
    assert result.score_percent == 100


def test_run_submission_python_partial_pass():
    # Deliberately wrong on the second case to confirm partial scoring.
    code = "a, b = map(int, input().split())\nprint(a + b if a == 2 else 0)\n"
    test_cases = [
        {"input": "2 3", "expected_output": "5"},
        {"input": "10 20", "expected_output": "30"},
    ]
    result = run_submission("python", code, test_cases)
    assert result.passed_count == 1
    assert result.total_count == 2
    assert result.score_percent == 50


def test_run_submission_unsupported_language():
    result = run_submission("cobol", "print 5", [])
    assert result.compiled is False
    assert "Unsupported language" in result.compile_error
