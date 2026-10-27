import fs from 'node:fs';

const content = fs.readFileSync('.env.local', 'utf8');
content.split(/\r?\n/).forEach(l => {
  const parts = l.split('=');
  if (parts.length >= 2 && !l.startsWith('#')) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
});

// Since ES module evaluates top-level constants upon import, let's test fetch directly with the same logic as omniroute.ts
const BASE_URL = (process.env.OMNIROUTE_BASE_URL ?? "").replace(/\/+$/, "");
const API_KEY = process.env.OMNIROUTE_API_KEY ?? "";
const MODEL = process.env.OMNIROUTE_MODEL || "antigravity/gemini-3-flash";

async function testAllAI() {
  console.log("=== Testing AI Endpoints (Omniroute / Gemini 3 Flash) ===");
  console.log("Base URL:", BASE_URL);
  console.log("Model:", MODEL);

  // 1. Test Hint Generation API simulation
  console.log("\n[1/3] Testing Hint Generation...");
  const hintRes = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "Ты наставник по Python. Дай подсказку в формате JSON." },
        { role: "user", content: "Задача: посчитать сумму двух чисел a и b. Код студента: print(a)" }
      ],
      max_tokens: 500,
    }),
  });
  const hintData = await hintRes.json();
  console.log("Hint Status:", hintRes.status);
  console.log("Hint Output:", hintData.choices?.[0]?.message?.content?.slice(0, 300));

  // 2. Test Code Evaluation API simulation
  console.log("\n[2/3] Testing Code Evaluation...");
  const evalRes = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "Ты проверяющий код на Python. Оцени код студента." },
        { role: "user", content: "Задача: вывести Hello World. Код: print('Hello World')" }
      ],
      max_tokens: 500,
    }),
  });
  const evalData = await evalRes.json();
  console.log("Eval Status:", evalRes.status);
  console.log("Eval Output:", evalData.choices?.[0]?.message?.content?.slice(0, 300));

  // 3. Test Module Generation API simulation
  console.log("\n[3/3] Testing Module Generation...");
  const modRes = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "Ты методист курса Python. Сгенерируй модуль по списку тем." },
        { role: "user", content: "Тема: Функции и модули" }
      ],
      max_tokens: 1000,
    }),
  });
  const modData = await modRes.json();
  console.log("Module Status:", modRes.status);
  console.log("Module Output:", modData.choices?.[0]?.message?.content?.slice(0, 300));

  console.log("\n=== All AI checks completed successfully! ===");
}

testAllAI().catch(console.error);
