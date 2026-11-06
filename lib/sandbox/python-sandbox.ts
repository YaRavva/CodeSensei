import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { INPUT_SETUP, STDOUT_SETUP } from "@/lib/pyodide/setup";
import {
  buildTestProgram,
  containsForbiddenFunctionDefinition,
  judgeOutcome,
  simplifyPythonError,
} from "@/lib/utils/test-runner";
import type { TestCase, TestResult, TestSuiteResult } from "@/types/test-case";

/**
 * Server-side test run (PRD 7, 11). XP is granted only for solutions verified
 * here, so a forged "all tests passed" request no longer earns anything.
 *
 * Student code runs in Pyodide inside a separate Node process:
 * - empty environment: no secrets exist in the child at all;
 * - Node permission model: read access only to the Pyodide files, no writes,
 *   no child processes, workers or native addons;
 * - code generation from strings is disabled, `process`, `fetch` and other
 *   network globals are removed before the student code starts, Node file
 *   systems are unmounted from Pyodide;
 * - wall-clock limit and memory watchdog kill the process;
 * - every solution gets a fresh process (no state between users).
 */

const CHILD_SOURCE = String.raw`
import { constants as fsConstants } from "node:fs";
// Pyodide's NODEFS asks for fs constants through process.binding, which the
// permission model forbids. Nothing else may use it.
process.binding = (name) => {
  if (name === "constants") return { fs: fsConstants };
  throw new Error("blocked");
};
const write = process.stdout.write.bind(process.stdout);
const exit = process.exit.bind(process);
const send = (message) => write(JSON.stringify(message) + "\n");
const pyodideDir = process.argv[process.argv.length - 1];
const stdin = process.stdin;

const jobPromise = new Promise((resolve) => {
  let data = "";
  stdin.setEncoding("utf8");
  stdin.on("data", (chunk) => { data += chunk; });
  stdin.on("end", () => resolve(JSON.parse(data)));
});

try {
  const { loadPyodide } = await import(new URL("pyodide.mjs", "file://" + pyodideDir + "/").href);
  const py = await loadPyodide({ indexURL: pyodideDir + "/", stdout: () => {}, stderr: () => {} });
  send({ type: "ready" });
  const job = await jobPromise;
  for (const code of job.setup) py.runPython(code);
  py.runPython("import sys, json, traceback\nfrom io import StringIO\nsys.stderr = StringIO()");

  // Lock down the JS side before any student code runs.
  try { delete py.FS.filesystems.NODEFS; } catch {}
  for (const key of ["mountNodeFS", "mountNativeFS", "loadPackage", "loadPackagesFromImports", "registerJsModule", "setStdin", "setStdout", "setStderr"]) {
    try { py[key] = undefined; } catch {}
  }
  for (const key of ["fetch", "WebSocket", "EventSource", "XMLHttpRequest", "Request", "Response", "Headers", "FormData", "navigator", "BroadcastChannel", "MessageChannel", "MessagePort", "Worker", "require", "module", "process"]) {
    try { globalThis[key] = undefined; delete globalThis[key]; } catch {}
  }

  const results = [];
  for (const testCase of job.cases) {
    const started = Date.now();
    // The program executes the student code in its own restricted namespace
    // (see lib/utils/test-runner.ts) and leaves the produced values behind.
    // The verdict is NOT computed here: the expected value never reaches the
    // interpreter, so the student code cannot influence it.
    let error = null;
    try {
      py.runPython("_stdout_capture.reset()");
      py.runPython(testCase.program);
    } catch (execError) {
      error = String((execError && execError.message) || execError).slice(-2000);
    }
    if (!error) {
      try {
        const value = py.runPython("globals().get('_cs_error')");
        if (value !== undefined && value !== null && value !== "None") {
          error = String(value).slice(-2000);
        }
      } catch {}
    }
    if (error) {
      results.push({ id: testCase.id, error: error.slice(-2000), ms: Date.now() - started });
      continue;
    }

    const readJson = (name) => {
      try {
        const raw = py.runPython("globals().get('" + name + "')");
        return typeof raw === "string" ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    const result = readJson("_cs_result_json");
    const values = readJson("_cs_values_json");
    const files = readJson("_cs_files_json");
    let stdout = "";
    try {
      stdout = String(py.runPython("globals().get('_cs_stdout')") ?? "");
    } catch {}

    results.push({ id: testCase.id, result, values, stdout, files, ms: Date.now() - started });
    py.runPython("for _cs_name in ('_cs_ns', '_cs_error', '_cs_result', '_cs_result_json', '_cs_values', '_cs_values_json', '_cs_stdout', '_cs_files', '_cs_files_json'):\n    globals().pop(_cs_name, None)");
  }
  send({ type: "done", results });
  exit(0);
} catch (error) {
  send({ type: "crash", error: String((error && error.message) || error).slice(0, 2000) });
  exit(1);
}
`;

const MAX_CONCURRENT = 2;
const MAX_QUEUE = 20;
const LOAD_TIMEOUT_MS = 20_000;
const PER_CASE_MS = 2_000;
const MAX_RUN_MS = 10_000;
const MAX_RSS_KB = 512 * 1024;
const TIMEOUT_ERROR = "Превышено время выполнения. Проверьте, что циклы завершаются.";
const MEMORY_ERROR = "Программа использует слишком много памяти.";
const FORBIDDEN_DEF_ERROR =
  "В этом задании нельзя объявлять функции. Уберите строку с def и используйте линейный код.";

export class SandboxUnavailableError extends Error {}

function findPyodideDir(): string {
  const candidates: string[] = [];
  try {
    const require = createRequire(path.join(process.cwd(), "package.json"));
    candidates.push(path.dirname(require.resolve("pyodide/package.json")));
  } catch {
    // fall through to the plain path
  }
  candidates.push(path.join(process.cwd(), "node_modules", "pyodide"));
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "pyodide.asm.wasm"))) return fs.realpathSync(dir);
  }
  throw new SandboxUnavailableError("Pyodide files not found");
}

let permissionFlags: string[] | null = null;

/** Picks the permission-model flag supported by this Node version. */
function getPermissionFlags(pyodideDir: string): string[] {
  if (permissionFlags) return permissionFlags;
  const [major, minor] = process.versions.node.split(".").map(Number);
  const flag =
    major > 22 || (major === 22 && minor >= 13) ? "--permission" : "--experimental-permission";
  permissionFlags = [flag, `--allow-fs-read=${pyodideDir}/*`, `--allow-fs-read=${pyodideDir}`];
  return permissionFlags;
}

interface Warm {
  child: ChildProcess;
  ready: Promise<void>;
  lines: AsyncIterator<string>;
}

function readLines(child: ChildProcess): AsyncIterator<string> {
  const queue: string[] = [];
  const waiters: ((value: IteratorResult<string>) => void)[] = [];
  let buffer = "";
  let ended = false;
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    if (buffer.length > 2_000_000) child.kill("SIGKILL");
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      const waiter = waiters.shift();
      if (waiter) waiter({ value: line, done: false });
      else queue.push(line);
      index = buffer.indexOf("\n");
    }
  });
  const finish = () => {
    ended = true;
    for (const waiter of waiters.splice(0)) waiter({ value: undefined, done: true });
  };
  child.on("exit", finish);
  child.on("error", finish);
  return {
    next: () =>
      new Promise((resolve) => {
        const line = queue.shift();
        if (line !== undefined) resolve({ value: line, done: false });
        else if (ended) resolve({ value: undefined, done: true });
        else waiters.push(resolve);
      }),
  };
}

function startChild(): Warm {
  const pyodideDir = findPyodideDir();
  const child = spawn(
    process.execPath,
    [
      ...getPermissionFlags(pyodideDir),
      "--disallow-code-generation-from-strings",
      "--max-old-space-size=128",
      "--input-type=module",
      "-e",
      CHILD_SOURCE,
      pyodideDir,
    ],
    { env: {} as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "pipe"], cwd: pyodideDir }
  );
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    if (stderr.length < 4000) stderr += chunk;
  });
  const lines = readLines(child);
  const ready = (async () => {
    const timer = setTimeout(() => child.kill("SIGKILL"), LOAD_TIMEOUT_MS);
    try {
      const first = await lines.next();
      if (first.done)
        throw new SandboxUnavailableError(`Sandbox exited during start: ${stderr.slice(0, 500)}`);
      const message = JSON.parse(first.value) as { type: string; error?: string };
      if (message.type !== "ready")
        throw new SandboxUnavailableError(`Sandbox failed to start: ${message.error ?? ""}`);
    } finally {
      clearTimeout(timer);
    }
  })();
  ready.catch(() => child.kill("SIGKILL"));
  return { child, ready, lines };
}

let warm: Warm | null = null;

function takeWarmChild(): Warm {
  const current = warm && warm.child.exitCode === null && !warm.child.killed ? warm : startChild();
  warm = null;
  // Prepare the next process in the background so the next check starts fast.
  setTimeout(() => {
    try {
      if (!warm) {
        warm = startChild();
        warm.ready.catch(() => {
          warm = null;
        });
      }
    } catch {
      warm = null;
    }
  }, 0);
  return current;
}

let running = 0;
const waiting: (() => void)[] = [];

async function acquire(): Promise<() => void> {
  if (running >= MAX_CONCURRENT) {
    if (waiting.length >= MAX_QUEUE) throw new SandboxUnavailableError("Sandbox queue is full");
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  running += 1;
  return () => {
    running -= 1;
    waiting.shift()?.();
  };
}

function rssKb(pid: number | undefined): number {
  if (!pid) return 0;
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const match = status.match(/VmRSS:\s+(\d+)/);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

interface ChildResult {
  id: string;
  /** Value produced by the student program. */
  result?: unknown;
  /** Every variable the student defined. */
  values?: Record<string, unknown> | null;
  /** Program output. */
  stdout?: string;
  /** Files the program wrote. */
  files?: Record<string, string> | null;
  error?: string;
  ms?: number;
}

/** Runs the task's tests against the student's code on the server. */
export async function runServerTestSuite(
  userCode: string,
  testCases: TestCase[],
  taskType: "linear" | "function" | "class" = "linear"
): Promise<TestSuiteResult> {
  const started = Date.now();
  const summarize = (results: TestResult[]): TestSuiteResult => {
    const passedCount = results.filter((r) => r.passed).length;
    return {
      results,
      passedCount,
      totalCount: results.length,
      allPassed: results.length > 0 && passedCount === results.length,
      executionTime: Date.now() - started,
    };
  };

  if (testCases.length === 0) return summarize([]);
  if (containsForbiddenFunctionDefinition(userCode, taskType)) {
    return summarize(
      testCases.map((tc) => ({
        testCaseId: tc.id,
        passed: false,
        error: FORBIDDEN_DEF_ERROR,
        executionTime: 0,
      }))
    );
  }

  const release = await acquire();
  const { child, ready, lines } = takeWarmChild();
  try {
    await ready;

    const job = {
      setup: [STDOUT_SETUP, INPUT_SETUP],
      cases: testCases.map((tc) => ({
        id: tc.id,
        program: buildTestProgram(userCode, tc, taskType),
      })),
    };
    let failure: string | null = null;
    const limit = Math.min(MAX_RUN_MS, 1_000 + PER_CASE_MS * testCases.length);
    const timer = setTimeout(() => {
      failure = TIMEOUT_ERROR;
      child.kill("SIGKILL");
    }, limit);
    const watchdog = setInterval(() => {
      if (rssKb(child.pid) > MAX_RSS_KB) {
        failure = MEMORY_ERROR;
        child.kill("SIGKILL");
      }
    }, 100);

    child.stdin?.end(JSON.stringify(job));
    let done: ChildResult[] | null = null;
    try {
      for (;;) {
        const line = await lines.next();
        if (line.done) break;
        const message = JSON.parse(line.value) as {
          type: string;
          results?: ChildResult[];
          error?: string;
        };
        if (message.type === "done") {
          done = message.results ?? [];
          break;
        }
        if (message.type === "crash") throw new SandboxUnavailableError(message.error ?? "crash");
      }
    } finally {
      clearTimeout(timer);
      clearInterval(watchdog);
    }

    if (!done) {
      if (!failure) throw new SandboxUnavailableError("Sandbox exited without a result");
      const error = failure;
      return summarize(
        testCases.map((tc) => ({ testCaseId: tc.id, passed: false, error, executionTime: 0 }))
      );
    }

    const byId = new Map(done.map((r) => [r.id, r]));
    return summarize(
      testCases.map((tc) => {
        const r = byId.get(tc.id);
        if (!r)
          return { testCaseId: tc.id, passed: false, error: "Тест не выполнен", executionTime: 0 };
        if (r.error) {
          return {
            testCaseId: tc.id,
            passed: false,
            error: simplifyPythonError(r.error),
            executionTime: r.ms ?? 0,
          };
        }

        // The verdict is computed here, on the server, outside the interpreter.
        const verdict = judgeOutcome(
          {
            error: undefined,
            result: r.result,
            values: r.values ?? undefined,
            stdout: r.stdout ?? "",
            files: r.files ?? undefined,
          },
          tc,
          taskType
        );

        return {
          testCaseId: tc.id,
          passed: verdict.passed,
          actualOutput: verdict.actual,
          error: verdict.error,
          executionTime: r.ms ?? 0,
        };
      })
    );
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
    release();
  }
}
