const { Client, Databases, Query } = require("node-appwrite");
const fs = require("fs");

const key = process.env.APPWRITE_API_KEY;
if (!key) throw new Error("APPWRITE_API_KEY is missing");
const db = new Databases(new Client().setEndpoint("https://appwrite.ravva.su/v1").setProject("6adc4f50003202881547").setKey(key));

const functionModulePattern = /функц|function|рекурсив|класс|лямбда/i;
const featurePatterns = {
  def: /\bdef\s+\w+\s*\(/,
  nestedDef: /\bdef\s+\w+\s*\([^)]*\)[\s\S]*\n\s{4,}def\s+\w+\s*\(/,
  if: /\bif\b|\belif\b|\belse\b/,
  loops: /\bfor\b|\bwhile\b|range\s*\(/,
  list: /\[.*\]|\.append\(|\.pop\(|\.remove\(/s,
  tuple: /\([^)]*,[^)]*\)/,
  len: /\blen\s*\(/,
  fstring: /(^|[^\w])f["']/,
  input: /\binput\s*\(/,
  print: /\bprint\s*\(/,
  try: /\btry\s*:/,
  class: /\bclass\s+\w+/,
  lambda: /\blambda\b|\bmap\s*\(|\bfilter\s*\(/,
};

function features(text) {
  const result = {};
  for (const [name, pattern] of Object.entries(featurePatterns)) result[name] = pattern.test(text || "");
  return result;
}

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  try { return JSON.parse(value || ""); } catch { return fallback; }
}

async function listAll(table, queries = []) {
  const all = [];
  let offset = 0;
  while (true) {
    const page = await db.listDocuments("codesensei", table, [...queries, Query.limit(100), Query.offset(offset)]);
    all.push(...page.documents);
    if (!page.documents.length || all.length >= page.total) return all;
    offset += page.documents.length;
  }
}

(async () => {
  const modules = await listAll("modules");
  const tasks = await listAll("tasks");
  const report = modules.map((module) => {
    const moduleTasks = tasks.filter((task) => task.module_id === module.$id).sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
    const functionModule = functionModulePattern.test(`${module.title} ${module.topic}`);
    return {
      id: module.$id,
      title: module.title,
      topic: module.topic,
      level: module.level,
      theory: module.description || "",
      theoryFeatures: features(module.description),
      functionModule,
      tasks: moduleTasks.map((task) => {
        const tests = parseJson(task.test_cases, []);
        const hints = parseJson(task.hints, []);
        const solution = task.solution_code || "";
        const starter = task.starter_code || "";
        const allCode = `${starter}\n${solution}\n${JSON.stringify(tests)}`;
        return {
          id: task.$id,
          title: task.title,
          order: task.order_index,
          difficulty: task.difficulty,
          taskType: task.task_type,
          description: task.description || "",
          starter,
          solution,
          hints,
          tests,
          codeFeatures: features(allCode),
          solutionFeatures: features(solution),
          usesDefOutsideFunctionModule: !functionModule && (features(solution).def || features(starter).def),
          nestedFunction: features(solution).nestedDef,
          testCount: tests.length,
          visibleTestCount: tests.filter((test) => test.is_visible !== false).length,
          testsWithMissingExpected: tests.filter((test) => test.expected_output === undefined).map((test) => test.id),
        };
      }),
    };
  });
  const output = JSON.stringify(report, null, 2);
  fs.writeFileSync("scripts/audit-all-modules-output.json", output, "utf8");
  console.log(`Audited ${report.length} modules and ${tasks.length} tasks.`);
})().catch((error) => { console.error(error.message); process.exit(1); });
