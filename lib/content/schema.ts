import { z } from "zod";

/**
 * Format of course content files (content/modules/*.yaml), PRD sections 3 and 5.
 * One file per curriculum module: theory (Markdown) and 4–6 tasks.
 */

const json: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(json), z.record(z.string(), json)])
);

export const testSchema = z.object({
  description: z.coerce.string().min(1),
  input: z.record(z.string(), json).default({}),
  stdin: z.array(z.string()).optional(),
  expected: json,
  visible: z.boolean().default(false),
  category: z.enum(["basic", "edge", "error"]).default("basic"),
  files: z.record(z.string(), z.string()).optional(),
  output_files: z.record(z.string(), z.string()).optional(),
});

export const taskSchema = z.object({
  slug: z.string().regex(/^t\d+$/),
  title: z.string().min(3),
  difficulty: z.enum(["easy", "medium", "hard"]),
  mode: z.enum(["stdout", "variable", "function", "class"]),
  description: z.string().min(20),
  starter: z.string(),
  solution: z.string().min(1),
  /** Three levels (PRD 8.1): guiding question, which construct, similar example. */
  hints: z.array(z.string().min(5)).length(3),
  tests: z.array(testSchema).min(1).max(4),
});

export const moduleSchema = z.object({
  id: z.string(),
  topic: z.string().min(10),
  theory: z.string().min(200),
  tasks: z.array(taskSchema).min(4).max(6),
});

export type ContentTest = z.infer<typeof testSchema>;
export type ContentTask = z.infer<typeof taskSchema>;
export type ContentModule = z.infer<typeof moduleSchema>;

export function taskId(moduleId: string, slug: string): string {
  return `${moduleId}_${slug}`;
}
