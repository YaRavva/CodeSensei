/**
 * Content audit (PRD 6.1, step 4) — checks that the texts of the theory, the
 * tasks and the starter code agree with each other and make sense.
 *
 * Unlike scripts/content/validate.ts (which checks the schema, the reference
 * solution and the length limits), this script looks for logical
 * contradictions:
 *
 *  - the example in the task description disagrees with what the reference
 *    solution produces for the visible test the example is taken from;
 *  - the starter code contradicts the comment that explains it, so following
 *    the comment leads to a wrong answer (the "false lead" case);
 *  - the starter code contradicts the "What already exists" section;
 *  - the starter code assigns a value that makes the task impossible (a
 *    product that starts from zero);
 *  - the theory shows a construct that no task of the course exercises.
 *
 * Run: node --import tsx scripts/content/audit.ts [moduleId…]
 */
import { loadPyodide } from "pyodide";
import type { ContentModule, ContentTask } from "@/lib/content/schema";
import { getCurriculumModule } from "@/lib/curriculum";
import { ANALYZER_SETUP } from "@/lib/curriculum-analyzer";
import { setupPyodide } from "@/lib/pyodide/setup";
import { runTestSuite } from "@/lib/utils/test-runner";
import { loadContent, toTestCases } from "./load";

type Py = Awaited<ReturnType<typeof loadPyodide>>;

interface Finding {
  where: string;
  problem: string;
}

/** Methods of the student's own classes — not course constructs. */
const OWN_METHODS = new Set(["method:bark", "method:put"]);

/** Names a task may use for its answer, whatever the module teaches. */
const RESULT_NAMES = ["result", "output"];

/** Built-in functions the hints may recommend. */
const BUILTINS = new Set([
  "print",
  "input",
  "int",
  "float",
  "str",
  "bool",
  "len",
  "range",
  "round",
  "abs",
  "sum",
  "min",
  "max",
  "sorted",
  "list",
  "dict",
  "set",
  "tuple",
  "enumerate",
  "zip",
  "map",
  "filter",
  "any",
  "all",
  "reversed",
  "open",
  "isinstance",
  "chr",
  "ord",
]);

function normalize(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/** The `text` block that follows the example section of a task. */
function exampleBlock(description: string): string | null {
  const match = description.match(/\*\*Пример[^*]*:\*\*[\s\S]*?```text\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

/** The `text` blocks of the theory. */
function theoryBlocks(theory: string): string[] {
  return [...theory.matchAll(/```python\n([\s\S]*?)```/g)].map((match) => match[1]);
}

/** The names assigned in a piece of code. */
function assignments(code: string): { name: string; value: string }[] {
  const result: { name: string; value: string }[] = [];
  for (const line of code.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*(?:#.*)?$/);
    if (match) result.push({ name: match[1], value: match[2] });
  }
  return result;
}

/**
 * The names the section "What already exists" promises to the student.
 *
 * A name inside a backticked expression ("isinstance(x, list)") is a parameter
 * of that expression, not a promised variable. A name after "не" ("это не `z`")
 * is a caution, not a promise. A capitalised name is a class.
 */
function promisedNames(text: string): string[] {
  const inExpressions = new Set<string>();
  for (const match of text.matchAll(/`([^`]*[()][^`]*)`/g)) {
    for (const name of match[1].matchAll(/([A-Za-z_]\w*)/g)) inExpressions.add(name[1]);
  }

  const names = new Set<string>();
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const snippet = match[1].trim();
    if (/[()]/.test(snippet)) continue;
    if (!/^[A-Za-z_]\w*$/.test(snippet)) continue;
    if (inExpressions.has(snippet)) continue;
    if (/^[A-Z]/.test(snippet)) continue;
    // The caution "это не `z`" does not promise the variable z.
    const caution = new RegExp(`не\\s+\`${snippet}\``);
    if (caution.test(text)) continue;
    names.add(snippet);
  }
  return [...names];
}

/** The variables the test cases supply to the program. */
function givenNames(task: ContentTask): Set<string> {
  const names = new Set<string>();
  for (const test of task.tests) {
    for (const name of Object.keys(test.input ?? {})) names.add(name);
  }
  return names;
}

/** The visible test the example of the description is taken from. */
function visibleTest(task: ContentTask): ContentTask["tests"][number] | undefined {
  return task.tests.find((test) => test.visible === true) ?? task.tests[0];
}

/**
 * The hints must not require a construct the reference solution does not use:
 * the student would follow the hint and fail the test.
 */
function checkHints(task: ContentTask, findings: Finding[]) {
  const where = `задание ${task.slug} «${task.title}»`;
  for (const hint of task.hints) {
    for (const match of hint.matchAll(/`([a-z_]\w*)\(/g)) {
      const name = match[1];
      if (!BUILTINS.has(name)) continue;
      if (new RegExp(`\\b${name}\\s*\\(`).test(task.solution)) continue;
      findings.push({
        where,
        problem: `подсказка требует вызвать ${name}(), но в эталоне этого вызова нет`,
      });
    }
  }
}

/**
 * The task forbids a construct ("не используйте `max()`"), so the reference
 * solution must not use it either — otherwise the student cannot pass.
 *
 * The prohibition belongs to the construct it stands next to: in "снимите их
 * через `pop()`. Срез `[::-1]` не используйте" the ban is on the slice, not
 * on pop().
 */
function checkForbidden(task: ContentTask, findings: Finding[]) {
  const where = `задание ${task.slug} «${task.title}»`;
  const forbidden = new Set<string>();

  for (const sentence of task.description.split(/[.\n]/)) {
    if (!/не\s+используй/i.test(sentence)) continue;

    // The constructs mentioned in the sentence, in order.
    const constructs = [...sentence.matchAll(/`([a-z_]\w*)\(\)`/g)].map((m) => m[1]);
    if (constructs.length === 0) continue;

    const ban = sentence.search(/не\s+используй/i);
    const before = sentence.slice(0, ban);
    const after = sentence.slice(ban);

    // The construct right before the ban: "Метод `index()` не используйте".
    const beforeMatch = [...before.matchAll(/`([a-z_]\w*)\(\)`/g)].pop();
    if (beforeMatch) forbidden.add(beforeMatch[1]);

    // The construct right after the ban: "не используйте `max()`".
    const afterMatch = after.match(/`([a-z_]\w*)\(\)`/);
    if (afterMatch) forbidden.add(afterMatch[1]);
  }

  for (const name of forbidden) {
    if (!new RegExp(`\\b${name}\\s*\\(`).test(task.solution)) continue;
    findings.push({
      where,
      problem: `условие запрещает ${name}(), но эталон её вызывает`,
    });
  }
}

/**
 * The starter code must not contain a value that makes the task impossible:
 * a product that starts from zero can never become non-zero.
 */
function checkFalseLead(task: ContentTask, findings: Finding[]) {
  const where = `задание ${task.slug} «${task.title}»`;
  const solution = task.solution;

  for (const { name, value } of assignments(task.starter)) {
    if (value !== "0") continue;
    // The solution multiplies this variable: a zero start is a dead end.
    const multiplies = new RegExp(
      `${name}\\s*\\*=|\\*=\\s*${name}\\b|${name}\\s*=\\s*${name}\\s*\\*`
    ).test(solution);
    if (!multiplies) continue;
    findings.push({
      where,
      problem: `старт задаёт ${name} = 0, а эталон умножает ${name} — произведение всегда останется нулём`,
    });
  }
}

/**
 * The starter code must not contain the answer: the student would only have to
 * press "check".
 */
function checkReadyAnswer(task: ContentTask, given: Set<string>, findings: Finding[]) {
  const where = `задание ${task.slug} «${task.title}»`;
  const test = visibleTest(task);
  if (!test) return;

  const expected = test.expected;
  if (expected === null || typeof expected === "object") return;

  for (const { name, value } of assignments(task.starter)) {
    if (value !== String(expected)) continue;
    // The value of an input variable is not the answer, even when it happens
    // to be equal to it.
    if (given.has(name)) continue;
    // The value belongs to a variable the student must compute.
    if (!new RegExp(`\\b${name}\\b`).test(task.solution)) continue;
    findings.push({
      where,
      problem: `старт уже содержит ответ: ${name} = ${value}`,
    });
  }
}

/** The starter and the "What already exists" section must agree. */
function checkGivenSection(task: ContentTask, given: Set<string>, findings: Finding[]) {
  const where = `задание ${task.slug} «${task.title}»`;
  const section = task.description.match(/\*\*Что уже есть:\*\*([\s\S]*?)(?=\n\n|\*\*|$)/);
  if (!section) return;
  const text = section[1];

  const assigned = new Set(assignments(task.starter).map((item) => item.name));

  // "nothing" — the starter must not define anything.
  if (/ничего|пустой редактор|пустая строка/i.test(text) && assigned.size > 0) {
    findings.push({
      where,
      problem: `в разделе «Что уже есть» сказано, что ничего нет, а старт задаёт: ${[...assigned].join(", ")}`,
    });
  }

  // Every variable the section promises must be in the starter or supplied by
  // the test case.
  for (const name of promisedNames(text)) {
    if (RESULT_NAMES.includes(name)) continue;
    if (assigned.has(name) || given.has(name)) continue;
    // A class the task asks the student to subclass is declared in the starter.
    if (new RegExp(`class\\s+${name}\\b`).test(task.starter)) continue;
    // The name may be a parameter of the function the task asks for.
    if (new RegExp(`def\\s+\\w+\\([^)]*\\b${name}\\b`).test(task.solution)) continue;
    if (new RegExp(`\\b${name}\\s*\\(`).test(task.solution)) continue;
    findings.push({
      where,
      problem: `раздел «Что уже есть» обещает переменную ${name}, но её нет ни в старте, ни во входных данных`,
    });
  }
}

/**
 * Compares two values the way Python does: `120` and `"120"` are the same
 * number, `True` and `true` are the same boolean, and a list may be written
 * with single quotes.
 */
function sameValue(actual: unknown, wanted: unknown): boolean {
  if (actual === wanted) return true;
  if (typeof actual === "number" && typeof wanted === "number") {
    return Math.abs(actual - wanted) < 0.0001;
  }
  if (typeof actual === "boolean" && typeof wanted === "boolean") return actual === wanted;

  const normalize = (value: unknown): string =>
    JSON.stringify(value)
      .replace(/"/g, "")
      .replace(/true/g, "True")
      .replace(/false/g, "False")
      .replace(/null/g, "None")
      .replace(/\s+/g, "");

  return normalize(actual) === normalize(wanted);
}

/** The value of a Python literal written in the example. */
function parseLiteral(text: string): unknown {
  const trimmed = text.trim();
  if (/^\(.*\)$/.test(trimmed)) {
    // A tuple: (1, 9)
    const inner = trimmed.slice(1, -1);
    return inner
      .split(",")
      .map((item) => parseLiteral(item))
      .filter((item) => item !== "");
  }
  if (/^[[{]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed.replace(/'/g, '"'));
    } catch {
      return trimmed;
    }
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === "True") return true;
  if (trimmed === "False") return false;
  return trimmed.replace(/^["'](.*)["']$/, "$1");
}

/**
 * True when the example of the description shows the value the reference
 * solution produced. The example may show one of the answer variables
 * ("result = 17"), the whole answer as a Python literal, or the beginning of
 * the printed output.
 */
function matchesExample(example: string, actual: unknown): boolean {
  const text = normalize(example);
  if (!text) return false;

  // The answer is written as "name = value", one pair per line.
  const pairs = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*$/);
    if (match) pairs.set(match[1], match[2]);
  }

  if (pairs.size > 0) {
    // The answer is a set of variables.
    if (actual && typeof actual === "object" && !Array.isArray(actual)) {
      const values = actual as Record<string, unknown>;
      return [...pairs].every(([name, wanted]) => {
        const value = values[name];
        return value !== undefined && sameValue(value, parseLiteral(wanted));
      });
    }
    // The answer is a single value written as "result = 120".
    const wanted = pairs.get("result") ?? [...pairs.values()][0];
    return sameValue(actual, parseLiteral(wanted));
  }

  // The whole answer as a literal.
  if (sameValue(actual, parseLiteral(text))) return true;

  // The beginning of the printed output.
  const printed = String(actual ?? "");
  return printed.startsWith(text) || normalize(printed) === text;
}

/**
 * The example of the description must agree with what the reference solution
 * produces for one of the tests.
 */
async function checkExample(py: Py, module: ContentModule, task: ContentTask, findings: Finding[]) {
  const where = `задание ${task.slug} «${task.title}»`;
  const taskType = getCurriculumModule(module.id)?.taskType;
  const example = exampleBlock(task.description);
  if (!example) return;
  if (!normalize(example)) return;

  const cases = toTestCases({ id: "", tasks: [task] } as ContentModule, task.slug);
  if (cases.length === 0) return;

  let matched = false;
  const produced: string[] = [];

  for (const testCase of cases) {
    const solved = await runTestSuite(task.solution, [testCase], py, taskType ?? "linear");
    const result = solved.results[0];
    if (!result) continue;
    if (!result.passed) {
      findings.push({
        where,
        problem: `эталон не проходит тест «${testCase.description}» — ${result.error ?? "вывод не совпал"}`,
      });
      return;
    }
    produced.push(JSON.stringify(result.actualOutput));

    if (matchesExample(example, result.actualOutput)) {
      matched = true;
      break;
    }

    // A task that writes a file: the example may show the file contents.
    for (const name of Object.keys(testCase.output_files ?? {})) {
      const content = readFile(py, name);
      if (content !== null && matchesExample(example, content)) {
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  if (!matched) {
    findings.push({
      where,
      problem: `пример в условии не совпадает ни с одним результатом эталона.\n      в условии: ${JSON.stringify(normalize(example))}\n      эталон даёт: ${produced.join(", ")}`,
    });
  }
}

/** The contents of a file the program wrote, or null when there is no such file. */
function readFile(py: Py, name: string): string | null {
  try {
    const raw = py.runPython(
      `import os as _cs_audit_os\n` +
        `_cs_audit_path = ${JSON.stringify(name)}\n` +
        `(_cs_audit_os.path.isfile(_cs_audit_path) and open(_cs_audit_path, encoding="utf-8").read()) or None`
    );
    return raw === undefined || raw === null ? null : String(raw);
  } catch {
    return null;
  }
}

/** The theory must not show a construct that no task of the course exercises. */
function checkTheoryPractice(
  py: Py,
  module: ContentModule,
  allModules: ContentModule[],
  findings: Finding[]
) {
  const used = new Set<string>();
  for (const item of allModules) {
    for (const task of item.tasks) {
      for (const token of features(py, task.solution)) used.add(token);
    }
  }

  const demonstrated = new Set<string>();
  for (const block of theoryBlocks(module.theory)) {
    for (const token of features(py, block)) demonstrated.add(token);
  }

  const unused = [...demonstrated].filter((token) => !used.has(token) && !OWN_METHODS.has(token));
  if (unused.length) {
    findings.push({
      where: `модуль ${module.id}`,
      problem: `теория показывает конструкции, которые не отрабатываются ни в одном задании курса: ${unused.join(", ")}`,
    });
  }
}

function features(py: Py, code: string): string[] {
  return JSON.parse(String(py.runPython(`_cs_features(${JSON.stringify(code)})`)));
}

async function main() {
  const only = process.argv.slice(2);
  const allModules = loadContent();
  const modules = allModules.filter((m) => only.length === 0 || only.includes(m.id));
  const py = await loadPyodide();
  setupPyodide(py);
  py.runPython(ANALYZER_SETUP);

  const findings: Finding[] = [];

  for (const module of modules) {
    const moduleFindings: Finding[] = [];
    for (const task of module.tasks) {
      const given = givenNames(task);
      checkFalseLead(task, moduleFindings);
      checkReadyAnswer(task, given, moduleFindings);
      checkHints(task, moduleFindings);
      checkForbidden(task, moduleFindings);
      checkGivenSection(task, given, moduleFindings);
      await checkExample(py, module, task, moduleFindings);
    }
    checkTheoryPractice(py, module, allModules, moduleFindings);

    console.log(`${moduleFindings.length ? "✗" : "✓"} ${module.id}`);
    for (const finding of moduleFindings) {
      console.log(`   - ${finding.where}: ${finding.problem}`);
    }
    findings.push(...moduleFindings);
  }

  console.log(
    findings.length
      ? `\nЗамечаний: ${findings.length}`
      : `\nЗамечаний нет: ${modules.length} модулей проверено`
  );
  process.exit(findings.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
