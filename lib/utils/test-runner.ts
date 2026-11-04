import type { TestCase, TestResult, TestSuiteResult } from "@/types/test-case";

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
  testCase: TestCase | undefined,
  taskType: "linear" | "function" | "class" = "linear"
): string {
  if (!testCase || taskType === "function") return userCode;

  const inputCode = Object.entries(testCase.input || {})
    .map(([key, value]) => `${key} = ${valueToPython(value)}`)
    .join("\n");
  const safeUserCode = removeTopLevelInputAssignments(userCode, Object.keys(testCase.input || {}));
  return `${inputCode}${inputCode ? "\n\n" : ""}${safeUserCode}`;
}

function inputToPythonArgs(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([key, value]) => `${key}=${valueToPython(value)}`)
    .join(", ");
}

function containsForbiddenFunctionDefinition(code: string, taskType: "linear" | "function" | "class"): boolean {
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
      if (taskType !== "class" || indent !== 0) return true;
      classIndent = indent;
      methodIndent = null;
      continue;
    }
    if (/^def\s+\w+\s*\(/.test(trimmed)) {
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

function simplifyPythonError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);
  const last = lines.at(-1) || message;
  const match = last.match(/(?:NameError|TypeError|SyntaxError|ValueError|IndexError|KeyError|ZeroDivisionError):\s*(.*)/);
  return match ? `${last.split(":")[0]}: ${match[1]}` : last;
}

export async function runTestCase(
  userCode: string,
  testCase: TestCase,
  pyodide: any,
  taskType: "linear" | "function" | "class" = "linear"
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    if (containsForbiddenFunctionDefinition(userCode, taskType)) {
      return {
        testCaseId: testCase.id,
        passed: false,
        error: "В этом задании нельзя объявлять функции. Уберите строку с def и используйте линейный код.",
        executionTime: 0,
      };
    }

    const input = testCase.input || {};
    const inputAssignment = Object.entries(input)
      .map(([key, value]) => `_test_ns[${valueToPython(key)}] = ${valueToPython(value)}`)
      .join("\n");
    const fixtureSetup = Object.keys(testCase.files || {}).length > 0 || Object.keys(testCase.output_files || {}).length > 0
      ? `
import os
_fixture_files = ${valueToPython(testCase.files || {})}
for _fixture_name, _fixture_content in _fixture_files.items():
    with open(_fixture_name, "w", encoding="utf-8") as _fixture_file:
        _fixture_file.write(_fixture_content)
_expected_output_files = ${valueToPython(testCase.output_files || {})}
for _output_name in _expected_output_files:
    try:
        os.remove(_output_name)
    except FileNotFoundError:
        pass
`
      : "";
    const safeUserCode = taskType === "linear"
      ? removeTopLevelInputAssignments(userCode, Object.keys(input))
      : userCode;
    const codeLiteral = JSON.stringify(safeUserCode);
    const expectedOutputPy = valueToPython(testCase.expected_output);
    const verificationMode = testCase.verification_mode || "variable";
    const functionMatch = userCode.match(/def\s+(\w+)\s*\(/);
    const functionName = functionMatch?.[1] || "solve";
    const functionNamePy = valueToPython(functionName);
    const functionArgs = Object.keys(input)
      .map((key) => `_test_ns[${valueToPython(key)}]`)
      .join(", ");

    let testCode = `
import json
_test_ns = {}
${inputAssignment}
${fixtureSetup}
`;

    if (taskType === "function") {
      testCode += `
exec(${codeLiteral}, _test_ns, _test_ns)
_test_function = _test_ns.get(${functionNamePy})
if _test_function is None:
    raise NameError("Функция ${functionName} не найдена. Объявите её через def.")
_test_result = _test_function(${functionArgs})
_test_expected = ${expectedOutputPy}
_test_passed = _compare_values(_test_result, _test_expected) if '_compare_values' in globals() else _test_result == _test_expected
_test_error = None
`;
    } else if (taskType === "class") {
      testCode += `
exec(${codeLiteral}, _test_ns, _test_ns)
_test_expected = ${expectedOutputPy}
if 'result' not in _test_ns:
    raise NameError("Не найдена переменная result. Сохраните ответ в result.")
_test_result = _test_ns['result']
_test_passed = _compare_values(_test_result, _test_expected)
_test_error = None
`;
    } else if (verificationMode === "stdout") {
      testCode += `
exec(${codeLiteral}, _test_ns, _test_ns)
_test_expected = ${expectedOutputPy}
_test_result = _stdout_capture.getvalue().strip()
_test_passed = _compare_values(_test_result, str(_test_expected).strip()) if '_compare_values' in globals() else _test_result == str(_test_expected).strip()
_test_error = None
`;
    } else {
      testCode += `
exec(${codeLiteral}, _test_ns, _test_ns)
_test_expected = ${expectedOutputPy}
_test_result = None
_test_passed = False
if isinstance(_test_expected, dict):
    _test_result = {}
    _test_passed = True
    for _key, _expected_value in _test_expected.items():
        if _key not in _test_ns:
            raise NameError(f"Переменная '{_key}' не найдена в решении.")
        _actual_value = _test_ns[_key]
        _test_result[_key] = _actual_value
        if not _compare_values(_actual_value, _expected_value):
            _test_passed = False
else:
    _target_name = 'result' if 'result' in _test_ns else ('output' if 'output' in _test_ns else None)
    if _target_name is None:
        raise NameError("Не найдена переменная result. Запишите ответ в result.")
    _test_result = _test_ns[_target_name]
    _test_passed = _compare_values(_test_result, _test_expected)
_output_files = ${valueToPython(testCase.output_files || {})}
for _output_name, _expected_content in _output_files.items():
    try:
        with open(_output_name, "r", encoding="utf-8") as _output_file:
            _actual_content = _output_file.read()
        if not _compare_values(_actual_content, _expected_content):
            _test_passed = False
    except Exception:
        _test_passed = False
_test_error = None
`;
    }

    testCode = `
import json
def _compare_values(actual, expected):
    try:
        if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
            return abs(actual - expected) < 0.0001
        if isinstance(actual, str) and isinstance(expected, str):
            return actual == expected
        if isinstance(actual, (list, dict)) or isinstance(expected, (list, dict)):
            return json.dumps(actual, sort_keys=True, ensure_ascii=False) == json.dumps(expected, sort_keys=True, ensure_ascii=False)
        return actual == expected
    except Exception:
        return False
${testCode}
`;

    await pyodide.runPythonAsync(testCode);

    const passed = Boolean(pyodide.runPython("bool(_test_passed)"));
    let actualOutput: unknown;
    try {
      const resultValue = pyodide.runPython("_test_result");
      if (resultValue !== undefined && resultValue !== null && resultValue !== "None") {
        actualOutput = resultValue;
      }
    } catch {
      actualOutput = undefined;
    }

    let error: string | undefined;
    try {
      const errorValue = pyodide.runPython("_test_error");
      if (errorValue && errorValue !== "None") error = String(errorValue);
    } catch {
      error = undefined;
    }

    try {
      pyodide.runPython("del _test_ns, _test_result, _test_passed, _test_error, _test_expected");
    } catch {
      // Cleanup is best effort; every test still uses a fresh namespace.
    }

    return {
      testCaseId: testCase.id,
      passed,
      actualOutput,
      error,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    try {
      pyodide.runPython("del _test_ns, _test_result, _test_passed, _test_error, _test_expected");
    } catch {
      // Ignore cleanup failures after an execution error.
    }
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
  testCases: TestCase[],
  pyodide: any,
  taskType: "linear" | "function" | "class" = "linear"
): Promise<TestSuiteResult> {
  const startTime = Date.now();

  if (containsForbiddenFunctionDefinition(userCode, taskType)) {
    const error = "В этом задании нельзя объявлять функции. Уберите строку с def и используйте линейный код.";
    const results = testCases.map((testCase) => ({
      testCaseId: testCase.id,
      passed: false,
      error,
      executionTime: 0,
    }));
    return { results, passedCount: 0, totalCount: results.length, allPassed: false, executionTime: Date.now() - startTime };
  }

  try {
    pyodide.runPython("_stdout_capture.reset()");
  } catch {
    // stdout capture is initialized by usePyodide.
  }

  const results: TestResult[] = [];
  for (const testCase of testCases) {
    try {
      pyodide.runPython("_stdout_capture.reset()");
    } catch {
      // Continue; variable-based checks do not require stdout.
    }
    results.push(await runTestCase(userCode, testCase, pyodide, taskType));
  }

  const passedCount = results.filter((result) => result.passed).length;
  return {
    results,
    passedCount,
    totalCount: results.length,
    allPassed: passedCount === results.length,
    executionTime: Date.now() - startTime,
  };
}
