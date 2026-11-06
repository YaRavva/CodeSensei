/**
 * Comparison of a student result with the expected value — on the TypeScript
 * side, never in Python.
 *
 * Why this lives outside the interpreter (PRD 11, security audit):
 * the student code is executed in the same Python process that used to run the
 * comparison helpers. A student could reach those helpers through
 * `sys.modules["__main__"].__dict__` and replace them with a function that
 * always returns True, which turned any wrong answer into a passed test and
 * awarded XP. The expected value itself was also readable from the runner's
 * frame (`sys._getframe(1).f_locals`).
 *
 * Now Python only executes the student program and returns the produced
 * value; the verdict is computed here, outside the reach of the student code.
 */

/** Normalizes a value the same way the Python helper used to. */
export function normalizeValue(value: unknown): unknown {
  if (value instanceof Set) {
    return [...value]
      .map(normalizeValue)
      .sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[String(key)] = normalizeValue(item);
    }
    return result;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // 5.0 == 5 and tiny float noise is ignored, as for single numbers.
    const rounded = Math.round(value * 1e6) / 1e6;
    return Number.isInteger(rounded) ? Math.trunc(rounded) : rounded;
  }

  return value;
}

/** Deterministic JSON representation used for deep comparison. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value ?? null) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

/** Normalizes program output: trailing spaces and trailing newlines are ignored. */
export function normalizeOutput(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Compares a student value with the expected one.
 *
 * The rules mirror the previous Python helper:
 * - booleans are compared by identity, never as numbers;
 * - numbers are compared with a 0.0001 tolerance;
 * - strings are compared exactly;
 * - lists, tuples, sets and dicts are compared structurally.
 */
export function compareValues(actual: unknown, expected: unknown): boolean {
  try {
    if (typeof actual === "boolean" || typeof expected === "boolean") {
      return actual === expected;
    }

    if (typeof actual === "number" && typeof expected === "number") {
      return Math.abs(actual - expected) < 0.0001;
    }

    if (typeof actual === "string" && typeof expected === "string") {
      return actual === expected;
    }

    if (Array.isArray(actual) || Array.isArray(expected)) {
      return stableStringify(normalizeValue(actual)) === stableStringify(normalizeValue(expected));
    }

    if (isPlainObject(actual) || isPlainObject(expected)) {
      return stableStringify(normalizeValue(actual)) === stableStringify(normalizeValue(expected));
    }

    return actual === expected;
  } catch {
    return false;
  }
}

/** Compares program output with the expected output, ignoring trailing whitespace. */
export function compareOutput(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

/**
 * Result of one test case as returned by the sandbox.
 *
 * `value` is the produced value, `stdout` is the captured program output.
 */
export interface SandboxOutcome {
  /** Value produced by the student program (`result`, `output`, or a function result). */
  value?: unknown;
  /** Program output, captured through stdout. */
  stdout?: string;
  /** Files written by the program, read back by the sandbox. */
  outputFiles?: Record<string, string>;
  /** Error raised by the student program, already simplified. */
  error?: string;
}

/**
 * Decides whether one test case passed, using only the value produced by the
 * sandbox and the expected value known to the server.
 */
export function compareOutcome(
  outcome: SandboxOutcome,
  expected: unknown
): { passed: boolean; actual: unknown } {
  if (outcome.error) {
    return { passed: false, actual: undefined };
  }

  const actual = outcome.value;

  // A mapping of expected values means several variables are checked at once.
  if (isPlainObject(expected)) {
    let passed = true;
    const result: Record<string, unknown> = {};

    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = isPlainObject(actual) ? actual[key] : undefined;
      result[key] = actualValue;
      if (actualValue === undefined) return { passed: false, actual: result };
      if (!compareValues(actualValue, expectedValue)) passed = false;
    }

    return { passed, actual: result };
  }

  if (actual === undefined) {
    return { passed: false, actual: undefined };
  }

  return { passed: compareValues(actual, expected), actual };
}
