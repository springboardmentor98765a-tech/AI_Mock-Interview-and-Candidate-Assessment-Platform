"""
Coding round auto-grader (Module: MCQ + Coding scoring).

Runs a candidate's submitted program against a question's test cases
(stdin -> stdout) and reports pass/fail per case plus partial-credit
marks. Deliberately simple — it shells out to a local `python3` /
`node` interpreter with a short timeout, the same way a lightweight
in-house judge would, rather than pulling in a full sandboxing stack.

SECURITY NOTE: this executes the candidate's code directly on the
host running this service, with only a wall-clock timeout for
protection — there is no seccomp/container/network isolation. That's
an acceptable trade-off for a self-hosted mock-interview tool used by
trusted candidates, but before exposing this to untrusted/public
users you'd want to run each submission inside a locked-down
container (no network, capped CPU/memory, non-root user) instead.
"""
import subprocess
from typing import TypedDict

RUN_TIMEOUT_SECONDS = 5

INTERPRETERS = {
    "python": ["python3", "-c"],
    "javascript": ["node", "-e"],
}


class TestCaseResult(TypedDict):
    input: str
    expected: str
    actual: str
    passed: bool


def _normalize_output(text: str) -> str:
    """Trims trailing whitespace on each line and at the ends, so
    grading isn't derailed by a stray trailing newline/space — the
    kind of difference that isn't meaningfully "wrong"."""
    return "\n".join(line.rstrip() for line in (text or "").strip("\n").split("\n")).strip()


def run_test_cases(code: str, language: str, test_cases: list[dict]) -> tuple[list[TestCaseResult], int]:
    """Runs `code` once per test case, feeding `input` on stdin and
    comparing (normalized) stdout to `output`. Returns (results, passed_count).
    A crash, non-zero exit, or timeout on a case just counts as a fail
    for that case — it never raises, so grading always completes."""
    interpreter = INTERPRETERS.get(language)
    if interpreter is None or not (code or "").strip():
        return (
            [
                {"input": tc["input"], "expected": tc["output"], "actual": "", "passed": False}
                for tc in test_cases
            ],
            0,
        )

    results: list[TestCaseResult] = []
    passed = 0
    for tc in test_cases:
        expected = _normalize_output(tc["output"])
        actual = ""
        ok = False
        try:
            proc = subprocess.run(
                [*interpreter, code],
                input=tc["input"],
                capture_output=True,
                text=True,
                timeout=RUN_TIMEOUT_SECONDS,
            )
            actual = proc.stdout
            ok = proc.returncode == 0 and _normalize_output(actual) == expected
        except subprocess.TimeoutExpired:
            actual = "(timed out)"
        except Exception as exc:  # interpreter missing, etc. — fail the case, don't crash grading
            actual = f"(error: {exc})"

        results.append({"input": tc["input"], "expected": tc["output"], "actual": actual.strip(), "passed": ok})
        if ok:
            passed += 1

    return results, passed
