const { Client, Databases } = require("node-appwrite");
const fs = require("fs");
const key = fs.readFileSync(".env.local", "utf8").match(/^APPWRITE_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("APPWRITE_API_KEY is missing");
const db = new Databases(new Client().setEndpoint("https://appwrite.ravva.su/v1").setProject("6adc4f50003202881547").setKey(key));
(async () => {
  const module = await db.getDocument("codesensei", "modules", "8c8f076b-9879-47d8-b503-ce38db78f439");
  console.log(JSON.stringify({ title: module.title, description: module.description }, null, 2));
})().catch((error) => { console.error(error.message); process.exit(1); });
