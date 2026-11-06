/**
 * Типы для тестовых случаев
 */

export type TestCaseCategory = "basic" | "edge" | "error";
export type VerificationMode = "variable" | "stdout" | "function" | "class";

export interface TestCase {
  id: string;
  description: string;
  input: Record<string, unknown>;
  /** Lines returned one by one by input() during the test. */
  stdin?: string[];
  files?: Record<string, string>;
  output_files?: Record<string, string>;
  expected_output: unknown;
  category: TestCaseCategory;
  is_visible: boolean;
  verification_mode?: VerificationMode;
}

/**
 * Test case as it may be sent to the student's browser.
 *
 * A hidden test carries neither its input nor its expected value: the student
 * would otherwise read the answer from the page source and hardcode it.
 */
export interface PublicTestCase {
  id: string;
  description: string;
  input: Record<string, unknown>;
  /** Lines returned one by one by input() during the test. */
  stdin?: string[];
  /** Files the program may read. */
  files?: Record<string, string>;
  /** Files the program must produce. */
  output_files?: Record<string, string>;
  category: TestCaseCategory;
  is_visible: boolean;
  /** Only for visible tests. */
  expected_output?: unknown;
  verification_mode?: VerificationMode;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: unknown;
  error?: string;
  executionTime?: number;
}

export interface TestSuiteResult {
  results: TestResult[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  executionTime: number;
}
