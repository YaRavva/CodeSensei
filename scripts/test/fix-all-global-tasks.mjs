import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();
const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

try {
  const response = await tablesDB.listRows({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: "tasks",
    queries: [],
  });

  for (const task of response.rows) {
    const hasDef = task.starter_code && task.starter_code.includes("def ");
    if (hasDef) continue;

    let testCases = JSON.parse(task.test_cases || "[]");
    if (testCases.length === 0) continue;

    const firstInput = testCases[0].input || {};
    const inputKeys = Object.keys(firstInput);

    // Special fix for task "Сложение двух чисел" where test cases had param1/param2 instead of a/b
    if (task.$id === "6ce2aca8-cf0c-4852-92cd-20130529071a") {
      testCases = testCases.map((tc) => ({
        ...tc,
        input: { a: tc.input.param1, b: tc.input.param2 },
      }));
      
      const newStarter = `# Переменные a и b уже заданы для примера
a = 2
b = 3

# Запишите результат в переменную result:
result = None
`;
      await tablesDB.updateRow({
        databaseId: env.APPWRITE_DATABASE_ID,
        tableId: "tasks",
        rowId: task.$id,
        data: {
          test_cases: JSON.stringify(testCases),
          starter_code: newStarter,
        },
      });
      console.log(`✓ Fixed task "Сложение двух чисел" (param1/param2 -> a/b)`);
      continue;
    }

    // For other tasks, let's ensure starter_code defines the input variables as a default example
    const sampleAssignment = inputKeys
      .map((k) => {
        const val = firstInput[k];
        if (typeof val === "string") return `${k} = "${val}"`;
        if (Array.isArray(val)) return `${k} = ${JSON.stringify(val)}`;
        if (val && typeof val === "object") return `${k} = ${JSON.stringify(val)}`;
        return `${k} = ${val}`;
      })
      .join("\n");

    // Check if starter_code already has assignments
    if (!inputKeys.every((k) => task.starter_code.includes(k + " =") || task.starter_code.includes(k + "="))) {
      const updatedStarter = `# Примеры входных переменных для теста:
${sampleAssignment}

# Запишите результат в переменную result:
${task.starter_code}`;

      await tablesDB.updateRow({
        databaseId: env.APPWRITE_DATABASE_ID,
        tableId: "tasks",
        rowId: task.$id,
        data: {
          starter_code: updatedStarter,
        },
      });
      console.log(`✓ Updated starter code for "${task.title}" with sample variables: ${inputKeys.join(", ")}`);
    }
  }

  console.log("All global variable tasks checked and updated successfully!");
} catch (error) {
  console.error("Error fixing tasks:", error);
}
