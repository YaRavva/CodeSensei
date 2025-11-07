import type { TestCase, TestResult, TestSuiteResult } from "@/types/test-case";

/**
 * Преобразует значение в Python код для использования в тестах
 */
function valueToPython(value: unknown): string {
  if (value === null || value === undefined) {
    return "None";
  }
  if (typeof value === "string") {
    // Экранируем кавычки и специальные символы
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
    return `"${escaped}"`;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => valueToPython(item)).join(", ");
    return `[${items}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, val]) => `"${key}": ${valueToPython(val)}`)
      .join(", ");
    return `{${entries}}`;
  }
  return String(value);
}

/**
 * Преобразует объект input в Python аргументы функции
 */
function inputToPythonArgs(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([key, value]) => `${key}=${valueToPython(value)}`)
    .join(", ");
}

/**
 * Сравнивает два значения с учетом типов Python
 */
function compareValues(actual: unknown, expected: unknown): boolean {
  // Строгое сравнение для примитивов
  if (
    typeof actual === "number" &&
    typeof expected === "number"
  ) {
    // Для чисел используем приблизительное сравнение для float
    if (Number.isInteger(actual) && Number.isInteger(expected)) {
      return actual === expected;
    }
    // Для float допускаем небольшую погрешность
    return Math.abs((actual as number) - (expected as number)) < 0.0001;
  }

  if (
    typeof actual === "boolean" &&
    typeof expected === "boolean"
  ) {
    return actual === expected;
  }

  if (typeof actual === "string" && typeof expected === "string") {
    return actual.trim() === expected.trim();
  }

  // Для массивов сравниваем поэлементно
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      return false;
    }
    return actual.every((item, index) =>
      compareValues(item, expected[index])
    );
  }

  // Для объектов сравниваем ключи и значения
  if (
    typeof actual === "object" &&
    actual !== null &&
    typeof expected === "object" &&
    expected !== null &&
    !Array.isArray(actual) &&
    !Array.isArray(expected)
  ) {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }
    return actualKeys.every(
      (key) =>
        key in expected &&
        compareValues(
          (actual as Record<string, unknown>)[key],
          (expected as Record<string, unknown>)[key]
        )
    );
  }

  // Для None/null
  if (
    (actual === null || actual === undefined) &&
    (expected === null || expected === undefined)
  ) {
    return true;
  }

  // Fallback: строгое сравнение
  return actual === expected;
}

/**
 * Выполняет один тестовый случай
 */
export async function runTestCase(
  userCode: string,
  testCase: TestCase,
  pyodide: any
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Извлекаем имя функции из кода пользователя
    // Ищем определение функции (например, def function_name(...))
    const functionMatch = userCode.match(/def\s+(\w+)\s*\(/);
    if (!functionMatch) {
      return {
        testCaseId: testCase.id,
        passed: false,
        error: "Не найдено определение функции. Убедитесь, что функция определена как def function_name(...)",
      };
    }

    const functionName = functionMatch[1];

    // Создаем тестовый код
    const testCode = `
${userCode}

# Функция сравнения значений
import json
def _test_compare(actual, expected):
    """Сравнивает два значения с учетом разных типов"""
    try:
        # Для чисел используем приблизительное сравнение для float
        if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
            if isinstance(actual, float) or isinstance(expected, float):
                return abs(actual - expected) < 0.0001
            return actual == expected
        
        # Для строк сравниваем с учетом пробелов
        if isinstance(actual, str) and isinstance(expected, str):
            return actual.strip() == expected.strip()
        
        # Для списков и словарей используем JSON сравнение
        if isinstance(actual, (list, dict)) or isinstance(expected, (list, dict)):
            actual_json = json.dumps(actual, sort_keys=True, ensure_ascii=False)
            expected_json = json.dumps(expected, sort_keys=True, ensure_ascii=False)
            return actual_json == expected_json
        
        # Для остальных случаев - прямое сравнение
        return actual == expected
    except Exception:
        return False

# Выполняем тест
try:
    _test_result = ${functionName}(${testCase.input ? inputToPythonArgs(testCase.input) : ""})
    _test_expected = ${valueToPython(testCase.expected_output)}
    _test_passed = _test_compare(_test_result, _test_expected)
    _test_error = None
except Exception as e:
    _test_result = None
    _test_passed = False
    _test_error = str(e)
`;

    // Выполняем тест
    await pyodide.runPythonAsync(testCode);

    // Получаем результаты
    let passed = false;
    let result: any = undefined;
    let error: string | undefined = undefined;

    try {
      passed = Boolean(pyodide.runPython("bool(_test_passed)"));
    } catch {
      passed = false;
    }

    try {
      const resultValue = pyodide.runPython("_test_result");
      result = resultValue !== undefined && resultValue !== null && resultValue !== "None"
        ? resultValue
        : undefined;
    } catch {
      result = undefined;
    }

    try {
      const errorValue = pyodide.runPython("_test_error");
      error = errorValue && errorValue !== "None" && errorValue !== null 
        ? String(errorValue) 
        : undefined;
    } catch {
      error = undefined;
    }

    // Очищаем тестовые переменные после получения результатов
    try {
      pyodide.runPython(`
try:
    del _test_result, _test_passed, _test_error, _test_expected, _test_compare
except:
    pass
`);
    } catch {
      // Игнорируем ошибки при очистке
    }

    const executionTime = Date.now() - startTime;

    return {
      testCaseId: testCase.id,
      passed,
      actualOutput: result,
      error,
      executionTime,
    };
  } catch (err) {
    const executionTime = Date.now() - startTime;
    
    // Улучшенная обработка ошибок
    let errorMessage = "";
    
    if (err instanceof Error) {
      errorMessage = err.message;
      
      // Извлекаем более понятное сообщение из traceback Python
      const lines = errorMessage.split('\n');
      const errorLine = lines[lines.length - 1] || errorMessage;
      
      // Упрощаем сообщение для пользователя
      if (errorLine.includes('UnboundLocalError')) {
        const match = errorLine.match(/UnboundLocalError: (.+)/);
        errorMessage = match ? `Ошибка: ${match[1]}` : errorLine;
      } else if (errorLine.includes('NameError')) {
        const match = errorLine.match(/NameError: (.+)/);
        errorMessage = match ? `Ошибка: ${match[1]}` : errorLine;
      } else {
        errorMessage = errorLine.trim();
      }
    } else {
      errorMessage = String(err);
    }

    // Очищаем состояние после ошибки
    try {
      pyodide.runPython(`
try:
    del _test_result, _test_passed, _test_error, _test_expected, _test_compare
except:
    pass
`);
    } catch {
      // Игнорируем ошибки при очистке
    }

    return {
      testCaseId: testCase.id,
      passed: false,
      error: errorMessage || "Произошла ошибка при выполнении теста",
      executionTime,
    };
  }
}

/**
 * Выполняет набор тестовых случаев
 */
export async function runTestSuite(
  userCode: string,
  testCases: TestCase[],
  pyodide: any
): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  // Сбрасываем буфер вывода перед тестами
  try {
    pyodide.runPython("_stdout_capture.reset()");
  } catch {
    // Игнорируем, если _stdout_capture еще не создан
  }

  // Выполняем каждый тест
  for (const testCase of testCases) {
    const result = await runTestCase(userCode, testCase, pyodide);
    results.push(result);
  }

  const executionTime = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return {
    results,
    passedCount,
    totalCount,
    allPassed: passedCount === totalCount,
    executionTime,
  };
}

