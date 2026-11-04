/**
 * Скрипт для анализа модуля в Appwrite TablesDB
 */

const { Client, TablesDB, Query } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://appwrite.ravva.su/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID || "6adc4f50003202881547")
  .setKey(process.env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "codesensei";

async function listAllModules() {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: "modules",
    queries: [Query.limit(100)],
  });
  return response.rows;
}

async function getTasksByModule(moduleId) {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: "tasks",
    queries: [
      Query.equal("module_id", moduleId),
      Query.orderAsc("order_index"),
      Query.limit(100),
    ],
  });
  return response.rows;
}

function safeJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function main() {
  try {
    console.log("=== Все модули ===\n");
    const modules = await listAllModules();
    
    modules.forEach(m => {
      console.log(`- ${m.title} (id: ${m.$id}, topic: ${m.topic}, level: ${m.level})`);
    });
    
    const targetModule = modules.find(m => 
      m.title.toLowerCase().includes("консольный") || 
      m.title.toLowerCase().includes("ввод") ||
      m.title.toLowerCase().includes("вывод")
    );
    
    if (!targetModule) {
      console.log("\nМодуль 'Консольный ввод и вывод' не найден!");
      return;
    }
    
    console.log(`\n\n=== МОДУЛЬ: ${targetModule.title} ===`);
    console.log(`ID: ${targetModule.$id}`);
    console.log(`Topic: ${targetModule.topic}`);
    console.log(`Level: ${targetModule.level}`);
    console.log(`Order: ${targetModule.order_index}`);
    console.log(`Published: ${targetModule.is_published}`);
    console.log(`\nDescription (theory):`);
    console.log(targetModule.description || "(пусто)");
    
    console.log(`\n--- ЗАДАНИЯ МОДУЛЯ ---`);
    const tasks = await getTasksByModule(targetModule.$id);
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`\n\n=== ЗАДАНИЕ ${i + 1}: ${task.title} ===`);
      console.log(`ID: ${task.$id}`);
      console.log(`Difficulty: ${task.difficulty}`);
      console.log(`XP: ${task.xp_reward}`);
      console.log(`Task Type: ${task.task_type}`);
      console.log(`Order: ${task.order_index}`);
      console.log(`\nDescription:`);
      console.log(task.description || "(пусто)");
      console.log(`\nStarter Code:`);
      console.log(task.starter_code || "(пусто)");
      console.log(`\nSolution Code:`);
      console.log(task.solution_code || "(пусто)");
      console.log(`\nTest Cases:`);
      console.log(JSON.stringify(safeJson(task.test_cases), null, 2));
      console.log(`\nHints:`);
      console.log(JSON.stringify(safeJson(task.hints), null, 2));
    }
    
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response:", JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();
