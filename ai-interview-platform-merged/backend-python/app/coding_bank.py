"""
Coding Practice — question bank + role -> language locking.

Standalone from the scored live-interview flow (Module 3's
interviews/question_bank.py). Every problem here is graded with plain
stdin -> stdout comparison (classic judge style), so the same problem
works unchanged across every supported language — only the starter
boilerplate differs. This keeps grading purely algorithmic (exact
output matching in judge.py), never AI-judged.

ROLE_LANGUAGE_OPTIONS is the single source of truth for "which
language does this role use" — the frontend renders its role dropdown
directly from GET /api/coding/roles instead of hard-coding its own
copy, so the two can never drift out of sync.
"""
from typing import Optional

# ---------------------------------------------------------------
# Role -> language locking
# ---------------------------------------------------------------
ROLE_LANGUAGE_OPTIONS = [
    {"role": "Java Developer", "language": "java"},
    {"role": "Python Developer", "language": "python"},
    {"role": "Frontend Developer", "language": "javascript"},
    {"role": "Full Stack Developer", "language": "javascript"},
    {"role": "C++ Developer", "language": "cpp"},
    {"role": "C Developer", "language": "c"},
    {"role": "Data Analyst", "language": "python"},
]

VALID_LANGUAGES = {"python", "javascript", "java", "cpp", "c"}

LANGUAGE_DISPLAY_NAME = {
    "python": "Python",
    "javascript": "JavaScript (Node.js)",
    "java": "Java",
    "cpp": "C++",
    "c": "C",
}


def language_for_role(role: str) -> str:
    """Locks the candidate's language to their chosen role. Falls back to
    Python for any role string that isn't one of the curated options
    above (e.g. a stray custom value)."""
    for opt in ROLE_LANGUAGE_OPTIONS:
        if opt["role"].lower() == (role or "").strip().lower():
            return opt["language"]
    return "python"


# ---------------------------------------------------------------
# Problem bank — stdin/stdout judge style, same test cases across
# every language. Each starter_code stub reads the described input
# and must print the described output; the class name for Java MUST
# stay "Main" (that's what judge.py compiles/runs).
# ---------------------------------------------------------------
PROBLEMS = [
    {
        "id": "sum-two-numbers",
        "title": "Sum of Two Numbers",
        "difficulty": "easy",
        "prompt": (
            "Read two space-separated integers A and B from standard input "
            "and print their sum."
        ),
        "test_cases": [
            {"input": "2 3\n", "expected_output": "5"},
            {"input": "10 -4\n", "expected_output": "6"},
            {"input": "0 0\n", "expected_output": "0"},
        ],
        "starter_code": {
            "python": (
                "# Read two integers separated by a space\n"
                "a, b = map(int, input().split())\n"
                "# TODO: print the sum of a and b\n"
                "print(0)\n"
            ),
            "javascript": (
                "const line = require('fs').readFileSync(0, 'utf-8').trim();\n"
                "const [a, b] = line.split(/\\s+/).map(Number);\n"
                "// TODO: print the sum of a and b\n"
                "console.log(0);\n"
            ),
            "java": (
                "import java.util.Scanner;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        int a = sc.nextInt();\n"
                "        int b = sc.nextInt();\n"
                "        // TODO: print the sum of a and b\n"
                "        System.out.println(0);\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <iostream>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    int a, b;\n"
                "    cin >> a >> b;\n"
                "    // TODO: print the sum of a and b\n"
                "    cout << 0 << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
            "c": (
                "#include <stdio.h>\n\n"
                "int main() {\n"
                "    int a, b;\n"
                "    scanf(\"%d %d\", &a, &b);\n"
                "    // TODO: print the sum of a and b\n"
                "    printf(\"%d\\n\", 0);\n"
                "    return 0;\n"
                "}\n"
            ),
        },
    },
    {
        "id": "reverse-string",
        "title": "Reverse a String",
        "difficulty": "easy",
        "prompt": "Read a single line of text and print it reversed.",
        "test_cases": [
            {"input": "hello\n", "expected_output": "olleh"},
            {"input": "AI Interview\n", "expected_output": "weivretnI IA"},
            {"input": "a\n", "expected_output": "a"},
        ],
        "starter_code": {
            "python": (
                "s = input()\n"
                "# TODO: print s reversed\n"
                "print(s)\n"
            ),
            "javascript": (
                "const s = require('fs').readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');\n"
                "// TODO: print s reversed\n"
                "console.log(s);\n"
            ),
            "java": (
                "import java.util.Scanner;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String s = sc.nextLine();\n"
                "        // TODO: print s reversed\n"
                "        System.out.println(s);\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <iostream>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    string s;\n"
                "    getline(cin, s);\n"
                "    // TODO: print s reversed\n"
                "    cout << s << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
            "c": (
                "#include <stdio.h>\n"
                "#include <string.h>\n\n"
                "int main() {\n"
                "    char s[1000];\n"
                "    if (fgets(s, sizeof(s), stdin) == NULL) return 0;\n"
                "    s[strcspn(s, \"\\n\")] = 0;\n"
                "    // TODO: print s reversed\n"
                "    printf(\"%s\\n\", s);\n"
                "    return 0;\n"
                "}\n"
            ),
        },
    },
    {
        "id": "check-palindrome",
        "title": "Check Palindrome",
        "difficulty": "easy",
        "prompt": (
            "Read a single word and print YES if it is a palindrome, "
            "otherwise print NO (case-sensitive)."
        ),
        "test_cases": [
            {"input": "madam\n", "expected_output": "YES"},
            {"input": "hello\n", "expected_output": "NO"},
            {"input": "a\n", "expected_output": "YES"},
        ],
        "starter_code": {
            "python": (
                "s = input().strip()\n"
                "# TODO: print YES if s is a palindrome, otherwise NO\n"
                "print(\"NO\")\n"
            ),
            "javascript": (
                "const s = require('fs').readFileSync(0, 'utf-8').trim();\n"
                "// TODO: print YES if s is a palindrome, otherwise NO\n"
                "console.log(\"NO\");\n"
            ),
            "java": (
                "import java.util.Scanner;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String s = sc.nextLine().trim();\n"
                "        // TODO: print YES if s is a palindrome, otherwise NO\n"
                "        System.out.println(\"NO\");\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <iostream>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    string s;\n"
                "    getline(cin, s);\n"
                "    // TODO: print YES if s is a palindrome, otherwise NO\n"
                "    cout << \"NO\" << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
            "c": (
                "#include <stdio.h>\n"
                "#include <string.h>\n\n"
                "int main() {\n"
                "    char s[1000];\n"
                "    if (fgets(s, sizeof(s), stdin) == NULL) return 0;\n"
                "    s[strcspn(s, \"\\n\")] = 0;\n"
                "    // TODO: print YES if s is a palindrome, otherwise NO\n"
                "    printf(\"%s\\n\", \"NO\");\n"
                "    return 0;\n"
                "}\n"
            ),
        },
    },
    {
        "id": "fizzbuzz",
        "title": "FizzBuzz",
        "difficulty": "medium",
        "prompt": (
            "Read an integer N. For each number from 1 to N (inclusive), print "
            "'Fizz' if it's divisible by 3, 'Buzz' if divisible by 5, 'FizzBuzz' "
            "if divisible by both, otherwise print the number itself. One value "
            "per line."
        ),
        "test_cases": [
            {"input": "5\n", "expected_output": "1\n2\nFizz\n4\nBuzz"},
            {
                "input": "15\n",
                "expected_output": (
                    "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"
                ),
            },
            {"input": "1\n", "expected_output": "1"},
        ],
        "starter_code": {
            "python": (
                "n = int(input())\n"
                "for i in range(1, n + 1):\n"
                "    # TODO: print Fizz/Buzz/FizzBuzz/i according to the rules\n"
                "    print(i)\n"
            ),
            "javascript": (
                "const n = parseInt(require('fs').readFileSync(0, 'utf-8').trim(), 10);\n"
                "const out = [];\n"
                "for (let i = 1; i <= n; i++) {\n"
                "  // TODO: push Fizz/Buzz/FizzBuzz/i according to the rules\n"
                "  out.push(String(i));\n"
                "}\n"
                "console.log(out.join('\\n'));\n"
            ),
            "java": (
                "import java.util.Scanner;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        int n = sc.nextInt();\n"
                "        StringBuilder sb = new StringBuilder();\n"
                "        for (int i = 1; i <= n; i++) {\n"
                "            // TODO: append Fizz/Buzz/FizzBuzz/i according to the rules\n"
                "            sb.append(i);\n"
                "            if (i < n) sb.append(\"\\n\");\n"
                "        }\n"
                "        System.out.println(sb.toString());\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <iostream>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    int n;\n"
                "    cin >> n;\n"
                "    for (int i = 1; i <= n; i++) {\n"
                "        // TODO: print Fizz/Buzz/FizzBuzz/i according to the rules\n"
                "        cout << i;\n"
                "        if (i < n) cout << \"\\n\";\n"
                "    }\n"
                "    cout << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
            "c": (
                "#include <stdio.h>\n\n"
                "int main() {\n"
                "    int n;\n"
                "    scanf(\"%d\", &n);\n"
                "    for (int i = 1; i <= n; i++) {\n"
                "        // TODO: print Fizz/Buzz/FizzBuzz/i according to the rules\n"
                "        printf(\"%d\", i);\n"
                "        if (i < n) printf(\"\\n\");\n"
                "    }\n"
                "    printf(\"\\n\");\n"
                "    return 0;\n"
                "}\n"
            ),
        },
    },
    {
        "id": "factorial",
        "title": "Find Factorial",
        "difficulty": "medium",
        "prompt": "Read a non-negative integer N and print N! (N factorial).",
        "test_cases": [
            {"input": "5\n", "expected_output": "120"},
            {"input": "0\n", "expected_output": "1"},
            {"input": "10\n", "expected_output": "3628800"},
        ],
        "starter_code": {
            "python": (
                "n = int(input())\n"
                "# TODO: compute n! (n factorial) and print it\n"
                "print(1)\n"
            ),
            "javascript": (
                "const n = parseInt(require('fs').readFileSync(0, 'utf-8').trim(), 10);\n"
                "// TODO: compute n! (n factorial) and print it\n"
                "console.log(1);\n"
            ),
            "java": (
                "import java.util.Scanner;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        int n = sc.nextInt();\n"
                "        // TODO: compute n! (n factorial) and print it\n"
                "        System.out.println(1);\n"
                "    }\n"
                "}\n"
            ),
            "cpp": (
                "#include <iostream>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    int n;\n"
                "    cin >> n;\n"
                "    // TODO: compute n! (n factorial) and print it\n"
                "    cout << 1 << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
            "c": (
                "#include <stdio.h>\n\n"
                "int main() {\n"
                "    int n;\n"
                "    scanf(\"%d\", &n);\n"
                "    // TODO: compute n! (n factorial) and print it\n"
                "    printf(\"%d\\n\", 1);\n"
                "    return 0;\n"
                "}\n"
            ),
        },
    },
]

_PROBLEMS_BY_ID = {p["id"]: p for p in PROBLEMS}


def list_problems_for_language(language: str) -> list:
    """Public-facing list (no test cases) for a given language."""
    out = []
    for p in PROBLEMS:
        out.append(
            {
                "id": p["id"],
                "title": p["title"],
                "difficulty": p["difficulty"],
                "prompt": p["prompt"],
                "language": language,
                "starter_code": p["starter_code"].get(language, ""),
            }
        )
    return out


def get_problem(problem_id: str) -> Optional[dict]:
    return _PROBLEMS_BY_ID.get(problem_id)


def get_random_bank_problem(language: str, difficulty: Optional[str] = None) -> dict:
    """Fallback used when AI generation is unavailable or fails
    validation — picks one problem from the curated, hand-verified
    bank so Coding Practice always has something to serve."""
    import random

    pool = [p for p in PROBLEMS if not difficulty or p["difficulty"] == difficulty] or PROBLEMS
    p = random.choice(pool)
    return {
        "id": p["id"],
        "title": p["title"],
        "difficulty": p["difficulty"],
        "prompt": p["prompt"],
        "language": language,
        "starter_code": p["starter_code"].get(language, ""),
        "test_cases": p["test_cases"],
        "source": "bank",
    }
