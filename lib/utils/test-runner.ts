import {
  compareOutcome,
  compareOutput,
  compareValues,
  normalizeOutput,
} from "@/lib/utils/test-compare";
import type { PublicTestCase, TestCase, TestResult, TestSuiteResult } from "@/types/test-case";

/**
 * Builds the Python program that runs one test case.
 *
 * Security (PRD 11, security audit of 2026-11-06):
 * the student program must not be able to influence the verdict.
 *
 * - The expected value is NOT part of the generated program. The verdict is
 *   computed in TypeScript (lib/utils/test-compare.ts), so the student cannot
 *   read the expected answer from the program source.
 * - The student code runs in its own namespace `_cs_ns` with a restricted
 *   `__builtins__` that has no `__import__`. Without it the student cannot
 *   import `sys` and reach `sys.modules["__main__"].__dict__`, which used to
 *   allow replacing the runner's comparison helpers with "always true".
 * - The runner's globals stay out of reach: functions defined by the student
 *   get `_cs_ns` as their `__globals__`, never the runner's namespace.
 * - The program only produces values (`_cs_result`, `_cs_stdout`, `_cs_values`,
 *   `_cs_files`); the caller compares them.
 */

/** Builtins available to the student program; `__import__` is deliberately absent. */
const SAFE_BUILTINS = [
  "abs",
  "all",
  "any",
  "bool",
  "bytes",
  "callable",
  "chr",
  "complex",
  "dict",
  "divmod",
  "enumerate",
  "filter",
  "float",
  "format",
  "frozenset",
  "hash",
  "hex",
  "id",
  "input",
  "int",
  "isinstance",
  "issubclass",
  "iter",
  "len",
  "list",
  "map",
  "max",
  "min",
  "next",
  "object",
  "oct",
  "open",
  "ord",
  "pow",
  "print",
  "range",
  "repr",
  "reversed",
  "round",
  "set",
  "slice",
  "sorted",
  "str",
  "sum",
  "super",
  "tuple",
  "type",
  "zip",
  "Exception",
  "BaseException",
  "ArithmeticError",
  "AttributeError",
  "IndexError",
  "KeyError",
  "NameError",
  "NotImplementedError",
  "OverflowError",
  "RecursionError",
  "RuntimeError",
  "StopIteration",
  "TypeError",
  "ValueError",
  "ZeroDivisionError",
];

/**
 * The isolation prelude. It is prepended to every generated program, so the
 * student code always runs in the same restricted namespace.
 */
const ISOLATION_PRELUDE = `
import builtins as _cs_builtins
import json as _cs_json
import traceback as _cs_traceback

_CS_BUILTIN_NAMES = ${JSON.stringify(SAFE_BUILTINS)}
# __import__ is intentionally missing: the student cannot import sys and
# cannot reach sys.modules["__main__"] to tamper with the test runner.
_cs_safe_builtins = {"__name__": "_cs_safe_builtins"}
for _cs_name in _CS_BUILTIN_NAMES:
    if hasattr(_cs_builtins, _cs_name):
        _cs_safe_builtins[_cs_name] = getattr(_cs_builtins, _cs_name)
_cs_safe_builtins["__build_class__"] = _cs_builtins.__build_class__
_cs_safe_builtins["__name__"] = "__main__"

# The namespace the student program runs in. It has no access to the runner's
# globals, so nothing here can be replaced from the outside.
_cs_ns = {"__name__": "__main__", "__builtins__": _cs_safe_builtins}


def _cs_to_json(value):
    """Converts a produced value into JSON-serializable data."""
    if isinstance(value, (set, frozenset)):
        return [_cs_to_json(item) for item in sorted(value, key=repr)]
    if isinstance(value, (list, tuple)):
        return [_cs_to_json(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _cs_to_json(item) for key, item in value.items()}
    return value
`;

function valueToPython(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "string") {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
    return `"${escaped}"`;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return `[${value.map(valueToPython).join(", ")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value)
      .map(([key, item]) => `${valueToPython(key)}: ${valueToPython(item)}`)
      .join(", ")}}`;
  }
  return String(value);
}

export function buildPreviewCode(
  userCode: string,
  testCase: Pick<TestCase, "input"> | undefined,
  taskType: "linear" | "function" | "class" = "linear"
): string {
  if (!testCase || taskType === "function") return userCode;

  const inputCode = Object.entries(testCase.input || {})
    .map(([key, value]) => `${key} = ${valueToPython(value)}`)
    .join("\n");
  const safeUserCode = removeTopLevelInputAssignments(userCode, Object.keys(testCase.input || {}));
  return `${inputCode}${inputCode ? "\n\n" : ""}${safeUserCode}`;
}

export function containsForbiddenFunctionDefinition(
  code: string,
  taskType: "linear" | "function" | "class"
): boolean {
  // Function tasks are exactly the ones where `def` is required.
  if (taskType === "function") return false;

  let classIndent: number | null = null;
  let methodIndent: number | null = null;
  for (const line of code.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    if (classIndent !== null && indent <= classIndent && !trimmed.startsWith("class ")) {
      classIndent = null;
      methodIndent = null;
    }
    if (/^class\s+\w+/.test(trimmed)) {
      // A class task allows one top-level class; anything else is not allowed.
      if (taskType !== "class" || indent !== 0) return true;
      classIndent = indent;
      methodIndent = null;
      continue;
    }
    if (/^def\s+\w+\s*\(/.test(trimmed)) {
      // Inside a class task only methods are allowed.
      if (taskType !== "class" || classIndent === null || indent <= classIndent) return true;
      if (methodIndent !== null && indent > methodIndent) return true;
      methodIndent = indent;
    }
  }
  return false;
}

/**
 * The starter code may contain an old local example such as `name = "Alice"`.
 * Input belongs to the test case, so top-level assignments to input names are ignored.
 */
function removeTopLevelInputAssignments(code: string, inputNames: string[]): string {
  if (inputNames.length === 0) return code;
  const names = inputNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const assignment = new RegExp(`^(\\s*)(${names})\\s*=\\s*(?!=)(.*)$`);
  return code
    .split("\n")
    .map((line) => {
      const match = line.match(assignment);
      if (!match || match[1].length > 0) return line;
      return `# Input ${match[2]} is supplied by the test case`;
    })
    .join("\n");
}

export function simplifyPythonError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines.at(-1) || message;
  const match = last.match(
    /(?:NameError|TypeError|SyntaxError|ValueError|IndexError|KeyError|ZeroDivisionError):\s*(.*)/
  );
  return match ? `${last.split(":")[0]}: ${match[1]}` : last;
}

/**
 * Builds the Python program that runs one test case.
 *
 * The program executes the student code in its own namespace and leaves the
 * produced values in `_cs_result`, `_cs_values`, `_cs_stdout` and `_cs_files`.
 * The expected value is not part of the program: the caller compares the
 * result (lib/utils/test-compare.ts).
 */
export function buildTestProgram(
  userCode: string,
  testCase: TestCase | PublicTestCase,
  taskType: "linear" | "function" | "class" = "linear"
): string {
  const input = testCase.input || {};
  const inputAssignment = Object.entries(input)
    .map(([key, value]) => `_cs_ns[${valueToPython(key)}] = ${valueToPython(value)}`)
    .join("\n");
  const outputFileNames = Object.keys(testCase.output_files || {});
  const fixtureSetup =
    Object.keys(testCase.files || {}).length > 0 || outputFileNames.length > 0
      ? `
import os as _cs_os
_cs_fixture_files = ${valueToPython(testCase.files || {})}
for _cs_fixture_name, _cs_fixture_content in _cs_fixture_files.items():
    with open(_cs_fixture_name, "w", encoding="utf-8") as _cs_fixture_file:
        _cs_fixture_file.write(_cs_fixture_content)
for _cs_output_name in ${valueToPython(outputFileNames)}:
    try:
        _cs_os.remove(_cs_output_name)
    except FileNotFoundError:
        pass
`
      : "";
  // Linear and class tasks read inputs from variables supplied by the test case.
  const safeUserCode =
    taskType === "function"
      ? userCode
      : removeTopLevelInputAssignments(userCode, Object.keys(input));
  const codeLiteral = JSON.stringify(safeUserCode);
  const verificationMode = testCase.verification_mode || "variable";
  const functionMatch = userCode.match(/def\s+(\w+)\s*\(/);
  const functionName = functionMatch?.[1] || "solve";
  const functionNamePy = valueToPython(functionName);
  const functionArgs = Object.keys(input)
    .map((key) => `_cs_ns[${valueToPython(key)}]`)
    .join(", ");

  const stdinPy = valueToPython((testCase.stdin ?? []).map(String));

  // How the produced value is taken out of the student's namespace.
  let resultCollection: string;
  if (taskType === "function") {
    resultCollection = `
_cs_function = _cs_ns.get(${functionNamePy})
if _cs_function is None:
    raise NameError("Функция ${functionName} не найдена. Объявите её через def.")
_cs_result = _cs_function(${functionArgs})
`;
  } else if (verificationMode === "stdout") {
    resultCollection = `
_cs_result = None
`;
  } else {
    resultCollection = `
_cs_result = _cs_ns.get("result", _cs_ns.get("output"))
`;
  }

  return `${ISOLATION_PRELUDE}
_cs_set_stdin(${stdinPy}, False)
${inputAssignment}
${fixtureSetup}
try:
    exec(${codeLiteral}, _cs_ns, _cs_ns)
except BaseException as _cs_exc:
    _cs_error = ''.join(_cs_traceback.format_exception_only(type(_cs_exc), _cs_exc)).strip()
else:
    _cs_error = None
${resultCollection}
# Every variable the student defined, so the server can check several of them.
_cs_values = {str(_cs_key): _cs_to_json(_cs_item) for _cs_key, _cs_item in _cs_ns.items() if not str(_cs_key).startswith("_")}
_cs_stdout = _stdout_capture.getvalue()
_cs_files = {}
for _cs_file_name in ${valueToPython(outputFileNames)}:
    try:
        with open(_cs_file_name, "r", encoding="utf-8") as _cs_file_handle:
            _cs_files[_cs_file_name] = _cs_file_handle.read()
    except Exception:
        pass
_cs_result_json = _cs_json.dumps(_cs_to_json(_cs_result), ensure_ascii=False, default=repr)
_cs_values_json = _cs_json.dumps(_cs_values, ensure_ascii=False, default=repr)
_cs_files_json = _cs_json.dumps(_cs_files, ensure_ascii=False, default=repr)
`;
}

/** Values the generated program leaves behind after a test case. */
export interface ProgramOutcome {
  error?: string;
  result?: unknown;
  values?: Record<string, unknown>;
  stdout?: string;
  files?: Record<string, string>;
}

function parseJson(raw: unknown): unknown {
  if (typeof raw !== "string") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Reads the values the generated program left in the interpreter. */
export function readOutcome(pyodide: { runPython: (code: string) => unknown }): ProgramOutcome {
  const outcome: ProgramOutcome = {};

  try {
    const error = pyodide.runPython("globals().get('_cs_error')");
    if (error !== undefined && error !== null && error !== "None") {
      outcome.error = simplifyPythonError(String(error));
    }
  } catch {
    // A broken interpreter leaves the outcome empty; the caller reports a failure.
  }

  if (outcome.error) return outcome;

  outcome.result = parseJson(pyodide.runPython("globals().get('_cs_result_json')"));
  outcome.values = parseJson(pyodide.runPython("globals().get('_cs_values_json')")) as
    | Record<string, unknown>
    | undefined;
  outcome.stdout = String(pyodide.runPython("globals().get('_cs_stdout')") ?? "");
  outcome.files = parseJson(pyodide.runPython("globals().get('_cs_files_json')")) as
    | Record<string, string>
    | undefined;

  return outcome;
}

/** Turns the values produced by the program into a verdict. */
export function judgeOutcome(
  outcome: ProgramOutcome,
  testCase: TestCase | PublicTestCase,
  taskType: "linear" | "function" | "class" = "linear"
): { passed: boolean; actual: unknown; error?: string } {
  const mode = testCase.verification_mode || "variable";

  if (outcome.error) {
    return { passed: false, actual: undefined, error: outcome.error };
  }

  if (mode === "stdout") {
    const stdout = outcome.stdout ?? "";
    const expected =
      typeof testCase.expected_output === "string"
        ? testCase.expected_output
        : String(testCase.expected_output);
    return { passed: compareOutput(stdout, expected), actual: stdout };
  }

  const expected = testCase.expected_output;
  const produced = outcome.result;

  // A function or class task returns one value, which may be a dict: the
  // expected value describes that single value.
  if (taskType === "function" || taskType === "class") {
    if (produced === undefined) {
      return { passed: false, actual: undefined, error: "Функция не вернула результат." };
    }
    return { passed: compareValues(produced, expected), actual: produced };
  }

  // A mapping of expected values means several variables are checked at once.
  // This matches the original behaviour: the keys are variable names.
  if (expected !== null && typeof expected === "object" && !Array.isArray(expected)) {
    const values = outcome.values ?? {};
    const actual: Record<string, unknown> = {};
    let passed = true;

    for (const [key, expectedValue] of Object.entries(expected as Record<string, unknown>)) {
      const actualValue = values[key];
      actual[key] = actualValue;
      if (actualValue === undefined) {
        return { passed: false, actual, error: `Переменная '${key}' не найдена в решении.` };
      }
      if (!compareValues(actualValue, expectedValue)) passed = false;
    }

    return { passed, actual };
  }

  const verdict = compareOutcome(
    { value: outcome.result, stdout: outcome.stdout, outputFiles: outcome.files },
    expected
  );

  if (!verdict.passed && verdict.actual === undefined) {
    return {
      passed: false,
      actual: undefined,
      error: "Не найдена переменная result. Запишите ответ в result.",
    };
  }

  // Output files are compared on the server side as well.
  const expectedFiles = "output_files" in testCase ? (testCase.output_files ?? {}) : {};
  for (const [name, expectedContent] of Object.entries(expectedFiles)) {
    const actualContent = outcome.files?.[name];
    if (actualContent === undefined) {
      return { passed: false, actual: verdict.actual, error: `Файл '${name}' не создан.` };
    }
    if (!compareValues(actualContent, expectedContent)) {
      return {
        passed: false,
        actual: verdict.actual,
        error: `Содержимое файла '${name}' не совпадает.`,
      };
    }
  }

  return { passed: verdict.passed, actual: verdict.actual };
}

/** Clears the values the program left in the interpreter. */
export function clearOutcome(pyodide: { runPython: (code: string) => unknown }): void {
  try {
    pyodide.runPython(
      "for _cs_name in ('_cs_error', '_cs_result', '_cs_result_json', '_cs_values', '_cs_values_json', '_cs_stdout', '_cs_files', '_cs_files_json'):\n    globals().pop(_cs_name, None)"
    );
  } catch {
    // Cleanup is best effort; every test uses a fresh namespace.
  }
}

export async function runTestCase(
  userCode: string,
  testCase: PublicTestCase,
  pyodide: any,
  taskType: "linear" | "function" | "class" = "linear"
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    if (containsForbiddenFunctionDefinition(userCode, taskType)) {
      return {
        testCaseId: testCase.id,
        passed: false,
        error:
          "В этом задании нельзя объявлять функции. Уберите строку с def и используйте линейный код.",
        executionTime: 0,
      };
    }

    const testCode = buildTestProgram(userCode, testCase, taskType);

    // Every test case starts with an empty output buffer.
    try {
      pyodide.runPython("_stdout_capture.reset()");
    } catch {
      // The buffer is initialized by setupPyodide.
    }

    await pyodide.runPythonAsync(testCode);

    const outcome = readOutcome(pyodide);
    const verdict = judgeOutcome(outcome, testCase, taskType);

    clearOutcome(pyodide);

    return {
      testCaseId: testCase.id,
      passed: verdict.passed,
      actualOutput: verdict.actual,
      error: verdict.error,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    clearOutcome(pyodide);
    return {
      testCaseId: testCase.id,
      passed: false,
      error: simplifyPythonError(error),
      executionTime: Date.now() - startTime,
    };
  }
}

export async function runTestSuite(
  userCode: string,
  testCases: PublicTestCase[],
  pyodide: any,
  taskType: "linear" | "function" | "class" = "linear"
): Promise<TestSuiteResult> {
  const startTime = Date.now();

  if (containsForbiddenFunctionDefinition(userCode, taskType)) {
    const error =
      "В этом задании нельзя объявлять функции. Уберите строку с def и используйте линейный код.";
    const results: TestResult[] = testCases.map((testCase) => ({
      testCaseId: testCase.id,
      passed: false,
      error,
      executionTime: 0,
    }));
    return {
      results,
      passedCount: 0,
      totalCount: results.length,
      allPassed: false,
      executionTime: Date.now() - startTime,
    };
  }

  const results: TestResult[] = [];
  for (const testCase of testCases) {
    results.push(await runTestCase(userCode, testCase, pyodide, taskType));
  }

  const passedCount = results.filter((result) => result.passed).length;
  return {
    results,
    passedCount,
    totalCount: results.length,
    allPassed: passedCount === results.length && results.length > 0,
    executionTime: Date.now() - startTime,
  };
}

export { normalizeOutput };
