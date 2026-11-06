import type { PublicTestCase, TestCase, TestResult } from "@/types/test-case";

/**
 * Builds the test case list that is safe to send to the browser.
 *
 * A visible test keeps its input and its expected value: the student is meant
 * to see what the first check asks for. A hidden test keeps only its
 * description, so the student can see how many checks exist without learning
 * the answer — otherwise the answer could be read from the page source and
 * hardcoded.
 */
export function toPublicTestCases(testCases: unknown): PublicTestCase[] {
  if (!Array.isArray(testCases)) return [];

  const result: PublicTestCase[] = [];

  for (const raw of testCases) {
    if (!raw || typeof raw !== "object") continue;
    const testCase = raw as Partial<TestCase>;

    const visible = testCase.is_visible === true;
    const input =
      visible &&
      testCase.input &&
      typeof testCase.input === "object" &&
      !Array.isArray(testCase.input)
        ? (testCase.input as Record<string, unknown>)
        : {};

    const entry: PublicTestCase = {
      id: typeof testCase.id === "string" ? testCase.id : `test_${result.length + 1}`,
      description: typeof testCase.description === "string" ? testCase.description : "Проверка",
      input,
      category: testCase.category ?? "basic",
      is_visible: visible,
    };

    if (visible) {
      // The stdin of a visible test is part of the published check.
      if (Array.isArray(testCase.stdin)) {
        entry.stdin = testCase.stdin.map(String);
      }
      entry.expected_output = testCase.expected_output;
      if (testCase.files && typeof testCase.files === "object") {
        entry.files = testCase.files;
      }
      if (testCase.output_files && typeof testCase.output_files === "object") {
        entry.output_files = testCase.output_files;
      }
    }

    // The verification mode is not a secret: the student sees it in the task.
    if (testCase.verification_mode) {
      entry.verification_mode = testCase.verification_mode;
    }

    result.push(entry);
  }

  return result;
}

/**
 * The visible part of the test list: the checks the student may run locally.
 *
 * The hidden checks have no expected value in the browser, so the client
 * cannot judge them — the authoritative verdict always comes from the server.
 */
export function visibleTestCases(testCases: unknown): PublicTestCase[] {
  if (!Array.isArray(testCases)) return [];
  return testCases.filter(
    (testCase): testCase is PublicTestCase =>
      Boolean(testCase) &&
      typeof testCase === "object" &&
      (testCase as PublicTestCase).is_visible === true
  );
}

/**
 * Test case list for the admin interface: the full data, including the
 * expected values, because the administrator edits the tests.
 */
export function toAdminTestCases(testCases: unknown): TestCase[] {
  if (!Array.isArray(testCases)) return [];
  return testCases.filter(
    (testCase): testCase is TestCase => Boolean(testCase) && typeof testCase === "object"
  );
}

/**
 * Test results as they may be sent to the student's browser.
 *
 * The results carry what the program produced, never the expected value: for a
 * hidden test the student must not learn what the correct answer is.
 */
export function toPublicTestResults(results: unknown): TestResult[] {
  if (!Array.isArray(results)) return [];

  return results.map((raw) => {
    const result = (raw ?? {}) as TestResult;
    return {
      testCaseId: result.testCaseId,
      passed: result.passed === true,
      actualOutput: result.actualOutput,
      error: result.error,
      executionTime: result.executionTime,
    };
  });
}
