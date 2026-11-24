/**
 * Automatic content validation (PRD 6.1, step 4) — no AI involved.
 * For every module in content/modules:
 *  - theory examples: every ```python block followed by ```text is executed and its
 *    output must match; examples use only constructs allowed in the module;
 *  - tasks: reference solution passes all tests, starter code passes none, solution
 *    uses only allowed constructs, its length and the text length match the
 *    difficulty (PRD 5.1), the text follows the template (5.2), 3 hints;
 *  - theory: every construct of a reference solution is explained by the theory
 *    of the module or of an earlier one, and every construct the theory shows
 *    is exercised by a task (PRD 5.2 — no term the theory does not explain);
 *  - module: 4–6 tasks, at least 2 easy, 1–2 medium, at least 1 hard, ordered by difficulty;
 *  - no near-duplicate tasks across the course.
 * Tests run in Pyodide through the same runner as the browser (lib/utils/test-runner.ts).
 *
 * Run: node --import tsx scripts/content/validate.ts [moduleId…]
 */
import { loadPyodide } from "pyodide";
import type { ContentModule, ContentTask } from "@/lib/content/schema";
import { allowedConstructs, getCurriculumModule, KNOWN_CONSTRUCTS } from "@/lib/curriculum";
import { ANALYZER_SETUP, FORBIDDEN_CONSTRUCTS } from "@/lib/curriculum-analyzer";
import { setupPyodide } from "@/lib/pyodide/setup";
import { runTestSuite } from "@/lib/utils/test-runner";
import { loadContent, toTestCases } from "./load";
import { THEORY_ALIASES, THEORY_MENTIONS } from "./theory-mentions";

// PRD 5.1: easy 1–3 lines (up to 4 from the conditions module on); `else:` is not counted.
const LIMITS = {
  easy: { lines: 3, words: 70 },
  medium: { lines: 8, words: 100 },
  hard: { lines: 15, words: 130 },
} as const;
/** def/class headers and return lines do not count as solution logic. */
const EXTRA_LINES = { linear: 0, function: 1, class: 4 } as const;
const ORDER = { easy: 0, medium: 1, hard: 2 } as const;

const orderOf = (id: string) => getCurriculumModule(id)?.order ?? 0;

/** Methods of the student's own classes — not course constructs. */
const OWN_METHODS = new Set(["method:bark", "method:put"]);

type Py = Awaited<ReturnType<typeof loadPyodide>>;

function logicLines(code: string, type: "linear" | "function" | "class"): number {
  const lines = code
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l !== "else:");
  const headers = lines.filter((l) => /^(def|class)\s/.test(l)).length;
  return lines.length - Math.min(headers, EXTRA_LINES[type] || headers);
}

function wordCount(markdown: string): number {
  const text = markdown.replace(/```[\s\S]*?```/g, " ").replace(/\*\*[^*]+\*\*/g, " ");
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function normalizeOutput(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

function features(py: Py, code: string): string[] {
  return JSON.parse(String(py.runPython(`_cs_features(${JSON.stringify(code)})`)));
}

function checkConstructs(py: Py, code: string, moduleId: string, where: string, errors: string[]) {
  let used: string[];
  try {
    used = features(py, code);
  } catch (error) {
    errors.push(`${where}: синтаксическая ошибка — ${String(error).split("\n").pop()}`);
    return;
  }
  const allowed = allowedConstructs(moduleId);
  const bad = used.filter(
    (t) => FORBIDDEN_CONSTRUCTS.has(t) || (KNOWN_CONSTRUCTS.has(t) && !allowed.has(t))
  );
  if (bad.length) errors.push(`${where}: конструкции вне программы модуля — ${bad.join(", ")}`);
}

async function runExample(py: Py, code: string): Promise<string> {
  py.runPython("_stdout_capture.reset()");
  py.runPython("_cs_set_stdin([], False)");
  await py.runPythonAsync(`exec(${JSON.stringify(code)}, {})`);
  return String(py.runPython("_stdout_capture.getvalue()"));
}

async function validateTheory(py: Py, module: ContentModule, errors: string[]) {
  const blocks = [
    ...module.theory.matchAll(
      /```python\n([\s\S]*?)```(?:\s*\n)*(?:Результат:?\s*\n+)?(```text\n([\s\S]*?)```)?/g
    ),
  ];
  if (blocks.length < 2) errors.push("теория: нужно минимум 2 примера кода");
  for (const [index, block] of blocks.entries()) {
    const code = block[1];
    checkConstructs(py, code, module.id, `теория, пример ${index + 1}`, errors);
    if (block[3] === undefined || /\binput\s*\(/.test(code) || /#\s*ошибка/i.test(code)) continue;
    try {
      const actual = await runExample(py, code);
      if (normalizeOutput(actual) !== normalizeOutput(block[3])) {
        errors.push(
          `теория, пример ${index + 1}: вывод не совпадает.\n  ожидали: ${JSON.stringify(block[3].trim())}\n  получили: ${JSON.stringify(actual.trim())}`
        );
      }
    } catch (error) {
      errors.push(
        `теория, пример ${index + 1}: ошибка выполнения — ${String(error).split("\n").filter(Boolean).pop()}`
      );
    }
  }
}

async function validateTask(py: Py, module: ContentModule, task: ContentTask, errors: string[]) {
  const where = `задание ${task.slug} «${task.title}»`;
  const curriculum = getCurriculumModule(module.id);
  if (!curriculum) {
    errors.push(`${where}: модуль ${module.id} отсутствует в программе курса`);
    return;
  }
  const type = curriculum.taskType;
  if (!curriculum.modes.includes(task.mode))
    errors.push(`${where}: режим ${task.mode} не подходит модулю`);

  const tests = toTestCases(module, task.slug);
  if (tests.length < 2 && !(module.id === "m01_print")) errors.push(`${where}: нужно 2–4 теста`);
  if (
    task.mode === "stdout" &&
    /\bresult\s*=/.test(task.solution) &&
    curriculum.order < orderOf("m08_for")
  ) {
    errors.push(`${where}: переменная result используется раньше модуля «Цикл for»`);
  }

  const solved = await runTestSuite(task.solution, tests, py, type);
  for (const result of solved.results.filter((r) => !r.passed)) {
    const test = tests.find((t) => t.id === result.testCaseId);
    errors.push(
      `${where}: эталон не проходит ${result.testCaseId} (${test?.description}) — ${result.error ?? `получили ${JSON.stringify(result.actualOutput)}, ожидали ${JSON.stringify(test?.expected_output)}`}`
    );
  }
  const starter = await runTestSuite(task.starter, tests, py, type);
  if (starter.passedCount > 0)
    errors.push(`${where}: стартовый код проходит ${starter.passedCount} тест(ов)`);

  checkConstructs(py, task.solution, module.id, `${where}, эталон`, errors);
  if (type === "linear" && /^\s*def\s/m.test(task.solution))
    errors.push(`${where}: def в линейном задании`);

  const lines = logicLines(task.solution, type);
  const loopBonus = task.difficulty === "easy" && curriculum.order >= orderOf("m05_if") ? 1 : 0;
  if (lines > LIMITS[task.difficulty].lines + loopBonus + (type === "class" ? 6 : 0)) {
    errors.push(
      `${where}: решение ${lines} строк — много для ${task.difficulty} (≤ ${LIMITS[task.difficulty].lines})`
    );
  }
  const words = wordCount(task.description);
  if (words > LIMITS[task.difficulty].words) {
    errors.push(
      `${where}: текст ${words} слов — длинно для ${task.difficulty} (≤ ${LIMITS[task.difficulty].words})`
    );
  }
  for (const label of ["**Что уже есть:**", "**Пример", "**Как проверим:**"]) {
    if (!task.description.includes(label)) errors.push(`${where}: в тексте нет раздела ${label}`);
  }
}

function similarity(a: string, b: string): number {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length > 3)
    );
  const x = words(a);
  const y = words(b);
  const common = [...x].filter((w) => y.has(w)).length;
  return common / Math.max(1, Math.min(x.size, y.size));
}

/**
 * Every construct of a reference solution must be explained by the theory the
 * student has read by then: the theory of this module or of an earlier one.
 * A construct that no theory mentions is a term the student cannot know
 * (PRD 5.2).
 */
function validateTheoryCoverage(
  py: Py,
  module: ContentModule,
  allModules: ContentModule[],
  errors: string[]
) {
  const current = orderOf(module.id);
  const known = allModules
    .filter((item) => orderOf(item.id) <= current)
    .map((item) => item.theory)
    .join("\n");

  const uncovered = new Map<string, string[]>();
  for (const task of module.tasks) {
    for (const token of features(py, task.solution)) {
      const pattern = THEORY_MENTIONS[token];
      if (!pattern) continue;
      const aliases = THEORY_ALIASES[token] ?? [];
      if (pattern.test(known) || aliases.some((alias) => alias.test(known))) continue;
      const list = uncovered.get(token) ?? [];
      list.push(task.slug);
      uncovered.set(token, list);
    }
  }

  for (const [token, slugs] of uncovered) {
    errors.push(`теория не объясняет ${token} — задания ${slugs.join(", ")}`);
  }
}

/**
 * The other way round: a construct the theory demonstrates, that no task of
 * the course exercises, stays unread.
 */
function validateTheoryPractice(
  py: Py,
  module: ContentModule,
  allModules: ContentModule[],
  errors: string[]
) {
  const used = new Set<string>();
  for (const item of allModules) {
    for (const task of item.tasks) {
      for (const token of features(py, task.solution)) used.add(token);
    }
  }

  const blocks = [...module.theory.matchAll(/```python\n([\s\S]*?)```/g)].map((match) => match[1]);
  const demonstrated = new Set<string>();
  for (const code of blocks) {
    for (const token of features(py, code)) demonstrated.add(token);
  }

  const unused = [...demonstrated].filter((token) => !used.has(token) && !OWN_METHODS.has(token));
  if (unused.length) {
    errors.push(`теория учит, но задания не отрабатывают — ${unused.join(", ")}`);
  }
}

async function main() {
  const only = process.argv.slice(2);
  const allModules = loadContent();
  const modules = allModules.filter((m) => only.length === 0 || only.includes(m.id));
  const py = await loadPyodide();
  setupPyodide(py);
  py.runPython(ANALYZER_SETUP);

  let failed = 0;
  for (const module of modules) {
    const errors: string[] = [];
    await validateTheory(py, module, errors);
    validateTheoryCoverage(py, module, allModules, errors);
    validateTheoryPractice(py, module, allModules, errors);

    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const task of module.tasks) counts[task.difficulty] += 1;
    if (counts.easy < 2 || counts.medium < 1 || counts.medium > 2 || counts.hard < 1) {
      errors.push(`состав заданий ${JSON.stringify(counts)}: нужно ≥2 easy, 1–2 medium, ≥1 hard`);
    }
    const ranks = module.tasks.map((t) => ORDER[t.difficulty]);
    if (ranks.some((rank, i) => i > 0 && rank < ranks[i - 1]))
      errors.push("задания не упорядочены по сложности");
    const slugs = module.tasks.map((t) => t.slug);
    if (new Set(slugs).size !== slugs.length) errors.push("повторяются slug заданий");

    for (const task of module.tasks) await validateTask(py, module, task, errors);

    console.log(`${errors.length ? "✗" : "✓"} ${module.id}: ${module.tasks.length} заданий`);
    for (const error of errors) console.log(`   - ${error}`);
    failed += errors.length;
  }

  const all = modules.flatMap((m) =>
    m.tasks.map((t) => ({ id: `${m.id}/${t.slug}`, text: `${t.title} ${t.description}` }))
  );
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (similarity(all[i].text, all[j].text) > 0.8) {
        console.log(`✗ похожие задания: ${all[i].id} и ${all[j].id}`);
        failed += 1;
      }
    }
  }

  console.log(
    failed
      ? `\nОшибок: ${failed}`
      : `\nВсё в порядке: ${modules.length} модулей, ${all.length} заданий`
  );
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
