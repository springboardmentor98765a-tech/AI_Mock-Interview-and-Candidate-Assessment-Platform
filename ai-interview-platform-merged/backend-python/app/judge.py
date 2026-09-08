"""
Coding Practice judge — runs a candidate's submitted code against a
problem's stdin/stdout test cases and scores it algorithmically (exact
output match after whitespace normalization), never via AI judgment.

Security note: this uses subprocess + best-effort OS resource limits
(CPU time, memory, no core dumps, process count) on POSIX systems. It
is NOT a full sandbox — it doesn't isolate the filesystem or network
the way a container (Docker/gVisor/firejail) would. That's an
acceptable tradeoff for a single-tenant practice tool run by its own
operator; if this is ever exposed multi-tenant on the public internet,
run submissions inside a locked-down container instead of relying on
this module alone.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from typing import List, Optional

TIMEOUT_SECONDS = 5
MEMORY_LIMIT_MB = 256


@dataclass
class TestCaseResult:
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    error: Optional[str] = None


@dataclass
class JudgeResult:
    language: str
    compiled: bool = True
    compile_error: Optional[str] = None
    results: List[TestCaseResult] = field(default_factory=list)

    @property
    def passed_count(self) -> int:
        return sum(1 for r in self.results if r.passed)

    @property
    def total_count(self) -> int:
        return len(self.results)

    @property
    def score_percent(self) -> int:
        if self.total_count == 0:
            return 0
        return round((self.passed_count / self.total_count) * 100)


def _limit_resources(skip_memory_limit: bool = False):
    """preexec_fn for subprocess — best-effort caps, POSIX only. Any
    failure here is swallowed so grading still works on platforms
    without the `resource` module (e.g. Windows).

    skip_memory_limit exists because RLIMIT_AS caps *virtual* address
    space, and runtimes like Node's V8 and the JVM reserve a large
    virtual range up front (far more than they'll actually touch) —
    capping it at MEMORY_LIMIT_MB makes them fail to start at all
    rather than actually bounding real memory use. CPU time + no core
    dumps + process-count limits still apply either way.
    """
    try:
        import resource

        resource.setrlimit(resource.RLIMIT_CPU, (TIMEOUT_SECONDS, TIMEOUT_SECONDS))
        if not skip_memory_limit:
            mem_bytes = MEMORY_LIMIT_MB * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
    except Exception:
        pass


# Languages whose runtime reserves a large virtual address space at
# startup regardless of actual memory used (see _limit_resources above).
_SKIP_MEMORY_LIMIT_LANGUAGES = {"javascript", "java"}


def _normalize(text: str) -> List[str]:
    """Line-by-line, trailing-whitespace-insensitive normalization so a
    stray trailing newline/space doesn't fail an otherwise-correct
    submission."""
    lines = (text or "").replace("\r\n", "\n").split("\n")
    while lines and lines[-1].strip() == "":
        lines.pop()
    return [line.rstrip() for line in lines]


def _which_or_none(binary: str) -> Optional[str]:
    return shutil.which(binary)


def run_submission(language: str, code: str, test_cases: list) -> JudgeResult:
    language = (language or "").lower()

    if language == "python":
        return _run_simple(language, code, test_cases, filename="solution.py", run_cmd=lambda p: [sys.executable or "python3", p])
    if language == "javascript":
        node_bin = _which_or_none("node")
        if not node_bin:
            return JudgeResult(language, compiled=False, compile_error="Node.js runtime ('node') is not installed on this server.")
        return _run_simple(language, code, test_cases, filename="solution.js", run_cmd=lambda p: [node_bin, p])
    if language == "java":
        return _run_java(code, test_cases)
    if language == "cpp":
        return _run_compiled(language, code, test_cases, source_name="solution.cpp", binary_name="solution", compiler="g++")
    if language == "c":
        return _run_compiled(language, code, test_cases, source_name="solution.c", binary_name="solution", compiler="gcc")

    return JudgeResult(language, compiled=False, compile_error=f"Unsupported language: {language}")


def _run_simple(language, code, test_cases, filename, run_cmd) -> JudgeResult:
    with tempfile.TemporaryDirectory(prefix="judge_") as tmp:
        path = os.path.join(tmp, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(code)
        results = [_execute(run_cmd(path), tc, cwd=tmp, language=language) for tc in test_cases]
        return JudgeResult(language, compiled=True, results=results)


def _run_compiled(language, code, test_cases, source_name, binary_name, compiler) -> JudgeResult:
    compiler_bin = _which_or_none(compiler)
    if not compiler_bin:
        return JudgeResult(
            language,
            compiled=False,
            compile_error=f"'{compiler}' is not installed on this server — a {language.upper()} compiler is required to grade this submission.",
        )

    with tempfile.TemporaryDirectory(prefix="judge_") as tmp:
        source_path = os.path.join(tmp, source_name)
        binary_path = os.path.join(tmp, binary_name)
        with open(source_path, "w", encoding="utf-8") as f:
            f.write(code)

        try:
            compile_proc = subprocess.run(
                [compiler_bin, "-O2", "-o", binary_path, source_path],
                cwd=tmp,
                capture_output=True,
                text=True,
                timeout=20,
            )
        except subprocess.TimeoutExpired:
            return JudgeResult(language, compiled=False, compile_error="Compilation timed out.")

        if compile_proc.returncode != 0:
            return JudgeResult(language, compiled=False, compile_error=compile_proc.stderr.strip()[:4000])

        results = [_execute([binary_path], tc, cwd=tmp, language=language) for tc in test_cases]
        return JudgeResult(language, compiled=True, results=results)


def _run_java(code, test_cases) -> JudgeResult:
    javac_bin = _which_or_none("javac")
    java_bin = _which_or_none("java")
    if not javac_bin or not java_bin:
        return JudgeResult(
            "java",
            compiled=False,
            compile_error="A JDK (javac + java) is not installed on this server — install a JDK to enable Java grading.",
        )

    with tempfile.TemporaryDirectory(prefix="judge_") as tmp:
        source_path = os.path.join(tmp, "Main.java")
        with open(source_path, "w", encoding="utf-8") as f:
            f.write(code)

        try:
            compile_proc = subprocess.run(
                [javac_bin, "Main.java"],
                cwd=tmp,
                capture_output=True,
                text=True,
                timeout=20,
            )
        except subprocess.TimeoutExpired:
            return JudgeResult("java", compiled=False, compile_error="Compilation timed out.")

        if compile_proc.returncode != 0:
            return JudgeResult("java", compiled=False, compile_error=compile_proc.stderr.strip()[:4000])

        results = [_execute([java_bin, "-cp", tmp, "Main"], tc, cwd=tmp, language="java") for tc in test_cases]
        return JudgeResult("java", compiled=True, results=results)


def _execute(cmd: List[str], test_case: dict, cwd: str, language: str = "") -> TestCaseResult:
    input_text = test_case.get("input", "")
    expected = test_case.get("expected_output", "")
    skip_mem_limit = language in _SKIP_MEMORY_LIMIT_LANGUAGES
    preexec = (lambda: _limit_resources(skip_mem_limit)) if os.name == "posix" else None

    try:
        proc = subprocess.run(
            cmd,
            input=input_text,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            preexec_fn=preexec,
            env={"PATH": os.environ.get("PATH", "")},
        )
    except subprocess.TimeoutExpired:
        return TestCaseResult(input_text, expected, "", False, error="Time Limit Exceeded")
    except Exception as exc:  # pragma: no cover - defensive
        return TestCaseResult(input_text, expected, "", False, error=f"Runtime error: {exc}")

    actual = proc.stdout
    if proc.returncode != 0:
        stderr_snippet = (proc.stderr or "").strip()[:2000]
        return TestCaseResult(input_text, expected, actual, False, error=stderr_snippet or f"Exited with code {proc.returncode}")

    passed = _normalize(actual) == _normalize(expected)
    return TestCaseResult(input_text, expected, actual.strip(), passed)
