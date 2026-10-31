import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();
const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

try {
  const taskId = "d5e11adb-5276-4b6f-aee6-b71e41db2558";
  const newTestCases = [
    {
      id: "test_1",
      input: { temp: 25 },
      category: "basic",
      is_visible: true,
      description: "Базовый случай (тепло)",
      expected_output: "тепло",
    },
    {
      id: "test_2",
      input: { temp: 20 },
      category: "edge",
      is_visible: false,
      description: "Граничный случай 20° (прохладно)",
      expected_output: "прохладно",
    },
    {
      id: "test_3",
      input: { temp: 5 },
      category: "edge",
      is_visible: false,
      description: "Граничный случай 5° (холодно)",
      expected_output: "холодно",
    },
  ];

  const updated = await tablesDB.updateRow({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: "tasks",
    rowId: taskId,
    data: {
      test_cases: JSON.stringify(newTestCases),
    },
  });
  console.log("Task test cases fixed successfully:", updated.$id);
} catch (error) {
  console.error("Error fixing test cases:", error);
}
