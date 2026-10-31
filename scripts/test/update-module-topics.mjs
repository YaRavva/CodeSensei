import { Client, TablesDB } from "node-appwrite";
import { loadEnv } from "./env.mjs";

const env = await loadEnv();

const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

const newTopics = {
  "8c8f076b-9879-47d8-b503-ce38db78f439": "Основы взаимодействия с пользователем: чтение данных и форматированный вывод.",
  "341df28c-ddb6-4021-8a66-fb9e31a1ba0b": "Управление ходом выполнения программы с помощью логических условий if, elif, else.",
  "e3307beb-5b01-467c-a7ef-12af1c4c0857": "Хранение данных в памяти, базовые типы (числа, строки, булевы значения) и присваивание.",
  "mod_floats": "Арифметика с плавающей точкой, погрешности вычислений и округление чисел.",
  "module_basics": "Первое знакомство с синтаксисом Python, создание простых функций и возврат результатов.",
  "mod_strings": "Индексация символов, срезы текста и основные методы работы со строками.",
  "mod_conditions": "Проверка нескольких условий и построение ветвящейся логики в программах.",
  "a8666f99-1cf9-4121-abf3-110d82957e95": "Создание собственных функций, передача аргументов и область видимости переменных.",
  "1bb33e2a-0ba6-4d7c-b3cc-e9f03ca11ef8": "Упорядоченные коллекции данных, добавление, удаление и изменение элементов.",
  "efb3e0dc-b750-46e9-8e59-7e04958a9be1": "Повторение блоков кода с помощью циклов for и while для обработки последовательностей.",
  "0d6aa089-39bf-4f64-9038-d866802c4b83": "Функции, вызывающие сами себя, с базовым случаем для решения задач с декомпозицией.",
  "cdf35d2e-f323-4a61-9f9a-97184be99290": "Неизменяемые последовательности данных для безопасного хранения фиксированных наборов.",
  "219e9052-2f10-4b14-919e-2ced851821b4": "Объектно-ориентированное программирование: создание собственных классов, объектов и методов.",
  "e244629c-2ad1-452c-b757-c3273440ae63": "Перехват ошибок выполнения программы и обеспечение её отказоустойчивости.",
  "mod_files": "Чтение и запись текстовых файлов на диске для сохранения состояния программ.",
  "mod_strings_advanced": "Форматирование текста с помощью f-строк, регулярные выражения и расширенная работа со строками.",
  "mod_comprehensions": "Компактное создание списков и словарей в одну строку с помощью генераторов.",
  "mod_lambdas": "Анонимные функции и функциональные методы map, filter для обработки коллекций.",
};

try {
  const response = await tablesDB.listRows({
    databaseId: env.APPWRITE_DATABASE_ID,
    tableId: "modules",
    queries: [],
  });

  console.log(`Found ${response.rows.length} modules. Updating topics...`);

  for (const row of response.rows) {
    const customTopic = newTopics[row.$id];
    if (customTopic) {
      await tablesDB.updateRow({
        databaseId: env.APPWRITE_DATABASE_ID,
        tableId: "modules",
        rowId: row.$id,
        data: {
          ...row,
          topic: customTopic,
        },
      });
      console.log(`✓ Updated module [${row.$id}] "${row.title}": topic -> "${customTopic}"`);
    } else {
      console.log(`- Skipped module [${row.$id}] "${row.title}" (no explicit topic override)`);
    }
  }

  console.log("All module topics updated successfully!");
} catch (error) {
  console.error("Failed to update module topics:", error);
  process.exitCode = 1;
}
