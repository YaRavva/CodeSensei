import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { CURRICULUM, getCurriculumModule } from "@/lib/curriculum";
import { type ContentModule, moduleSchema, taskId } from "@/lib/content/schema";
import type { TestCase } from "@/types/test-case";

export const CONTENT_DIR = join(process.cwd(), "content", "modules");

export function loadContent(): ContentModule[] {
  const files = readdirSync(CONTENT_DIR).filter((file) => file.endsWith(".yaml")).sort();
  const modules = files.map((file) => {
    const raw = parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
    const parsed = moduleSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    }
    if (!getCurriculumModule(parsed.data.id)) throw new Error(`${file}: unknown module id ${parsed.data.id}`);
    return parsed.data;
  });
  const order = new Map(CURRICULUM.map((m) => [m.id, m.order]));
  return modules.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Test cases in the database format (types/test-case.ts). */
export function toTestCases(module: ContentModule, slug: string): TestCase[] {
  const task = module.tasks.find((item) => item.slug === slug);
  if (!task) return [];
  return task.tests.map((test, index) => ({
    id: `test_${index + 1}`,
    description: test.description,
    input: test.input as Record<string, unknown>,
    ...(test.stdin ? { stdin: test.stdin } : {}),
    expected_output: test.expected,
    category: test.category,
    is_visible: test.visible || index === 0,
    verification_mode: task.mode,
    ...(test.files ? { files: test.files } : {}),
    ...(test.output_files ? { output_files: test.output_files } : {}),
  })) as TestCase[];
}

export { taskId };
