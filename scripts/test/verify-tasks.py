"""Verifies each task's solution_code against its test_cases by executing in subprocess."""
import json
import sys


def normalize(value):
    if isinstance(value, bool):
        return value
    return value


def run_solution(solution_code, test_case):
    """Executes solution and calls the function with kwargs, compares to expected_output."""
    ns = {}
    exec(solution_code, ns)
    fn = ns.get("function_name" if "def function_name" in solution_code else None)
    return fn


def main():
    with open("scripts/test/tasks-export.json", "r", encoding="utf-8") as f:
        tasks = json.load(f)

    passed_all = True
    for task in tasks:
        print(f"\n=== {task['title']} [{task['difficulty']}]")
        ns = {}
        exec(task["solution_code"], ns)
        # Find the function name from solution_code
        import re
        m = re.search(r"def\s+(\w+)\s*\(([^)]*)\)", task["solution_code"])
        if not m:
            print("  !! cannot parse solution def")
            passed_all = False
            continue
        fn = ns[m.group(1)]
        ok = True
        for tc in task["test_cases"]:
            try:
                result = fn(**tc["input"])
                match = result == tc["expected_output"]
                status = "PASS" if match else f"FAIL   expected {tc['expected_output']!r} got {result!r}"
                print(f"  [{tc['category']}] {tc['description']}: {status}")
                if not match:
                    ok = False
            except Exception as e:
                print(f"  [{tc['category']}] {tc['description']}: ERROR {e}")
                ok = False
        if ok:
            print("  -> solution correct")
        else:
            passed_all = False
            print("  -> solution INCORRECT")

    print("\n" + ("ALL PASS" if passed_all else "SOME FAILURES"))
    sys.exit(0 if passed_all else 1)


if __name__ == "__main__":
    main()
