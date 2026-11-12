import type { Task, TaskAttempt } from "@/types/db";
import type { TestSuiteResult } from "@/types/test-case";

export type TaskStatus = "not_started" | "in_progress" | "completed";

export interface TaskWithStatus extends Task {
  status: TaskStatus;
  lastAttempt: TaskAttempt | null;
}

export interface HintData {
  type: string;
  hint: string;
  steps: string[];
}

export interface FeedbackData {
  score: number;
  feedback: string;
}

export interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
}

export interface TaskState {
  code: string;
  initialCode: string;
  executionResult: ExecutionResult | null;
  testResults: TestSuiteResult | null;
  running: boolean;
  testing: boolean;
  isCompleted: boolean;
  lastAttempt: TaskAttempt | null;
  hintLoading: boolean;
  hintData: HintData | null;
  feedbackData: FeedbackData | null;
}

export type DockTab = "output" | "tests" | "hint" | "ai";
export type MobilePane = "task" | "code" | "result";
