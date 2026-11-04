const { Client, Databases } = require("node-appwrite");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const key = env.match(/^APPWRITE_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("APPWRITE_API_KEY is missing");
const db = new Databases(new Client().setEndpoint("https://appwrite.ravva.su/v1").setProject("6adc4f50003202881547").setKey(key));
const id = "82206b7e-1ad5-42bf-b905-68ef65d47bf4";
(async () => {
  const task = await db.getDocument("codesensei", "tasks", id);
  const tests = JSON.parse(task.test_cases);
  const next = tests.filter((test) => test.id !== "test_5");
  next.push({
    id: "test_5",
    description: "Имя с запятой — содержимое не изменяется",
    input: { name: "A,B" },
    expected_output: "Hello, A,B!",
    category: "edge",
    is_visible: true,
  });
  const updated = await db.updateDocument("codesensei", "tasks", id, { test_cases: JSON.stringify(next) });
  console.log(updated.test_cases);
})().catch((error) => { console.error(error.message); process.exit(1); });
