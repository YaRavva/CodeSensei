/**
 * Типы для тестовых случаев
 */

export type TestCaseCategory = "basic" | "edge" | "error";

export interface TestCase {
  id: string;
  description: string;
  input: Record<string, unknown>;
  expected_output: unknown;
  category: TestCaseCategory;
  is_visible: boolean;
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

