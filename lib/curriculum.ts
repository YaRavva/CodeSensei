/**
 * Curriculum as data (PRD 3.1–3.2): module order, learning goals, the constructs
 * each module introduces and the cumulative list of allowed constructs.
 *
 * Construct tokens are produced by the AST analyzer (lib/curriculum-analyzer.ts):
 *   call:<builtin>, method:<name>, kw:<keyword>, and syntax tokens such as
 *   if, elif, while, for, def, list, dict, fstring, slice, comprehension…
 * Used by the content validator, AI generation/hints and the admin UI.
 */

export type TaskType = "linear" | "function" | "class";
export type VerificationMode = "stdout" | "variable" | "function" | "class";

export interface CurriculumModule {
  id: string;
  order: number;
  title: string;
  level: number;
  goals: string[];
  introduces: string[];
  taskType: TaskType;
  modes: VerificationMode[];
  /** Optional modules open after the core course (PRD 3.2, "Дополнительно"). */
  extra?: boolean;
}

export const CURRICULUM: CurriculumModule[] = [
  {
    id: "m01_print", order: 1, level: 1, title: "Первая программа: print()",
    goals: ["Вывести текст на экран", "Вывести несколько значений в одной строке", "Оставить комментарий в коде"],
    introduces: ["call:print", "kw:sep", "kw:end"],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m02_variables", order: 2, level: 1, title: "Переменные и арифметика",
    goals: ["Сохранить значение в переменной", "Посчитать выражение", "Отличить / от // и %"],
    introduces: ["call:round", "call:abs"],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m03_input", order: 3, level: 1, title: "Ввод данных: input()",
    goals: ["Прочитать строку с клавиатуры", "Превратить строку в число", "Собрать программу «ввод → расчёт → вывод»"],
    introduces: ["call:input", "call:int", "call:float", "call:str"],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m04_strings", order: 4, level: 1, title: "Строки: основы",
    goals: ["Склеить и повторить строки", "Узнать длину строки", "Взять символ по индексу", "Собрать строку через f-строку"],
    introduces: ["call:len", "index", "fstring"],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m05_if", order: 5, level: 1, title: "Условия: if и else",
    goals: ["Сравнить два значения", "Выполнить код только при условии", "Выбрать один из двух вариантов"],
    introduces: ["if", "compare"],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m06_elif", order: 6, level: 2, title: "Несколько условий: elif, and, or, not",
    goals: ["Выбрать один из нескольких вариантов", "Объединить условия", "Проверить диапазон"],
    introduces: ["elif", "and", "or", "not"],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m06a_nested_if", order: 7, level: 2, title: "Вложенные условия и логические значения",
    goals: ["Записать условие внутри условия", "Сохранить результат сравнения в переменной", "Проверить диапазон двойным сравнением"],
    introduces: [],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m07_while", order: 8, level: 2, title: "Цикл while",
    goals: ["Повторять действие, пока выполняется условие", "Вести счётчик и сумму", "Остановить цикл через break"],
    introduces: ["while", "break", "continue", "augassign"],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m08_for", order: 9, level: 2, title: "Цикл for и range()",
    goals: ["Повторить действие заданное число раз", "Пройти по числам range()", "Пройти по символам строки"],
    introduces: ["for", "call:range"],
    taskType: "linear", modes: ["stdout", "variable"],
  },
  {
    id: "m08a_loop_patterns", order: 10, level: 2, title: "Циклы: сумма, счётчик, максимум",
    goals: ["Накопить сумму в цикле", "Посчитать подходящие значения", "Найти наибольшее значение", "Прочитать несколько чисел подряд"],
    introduces: [],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m08b_nested_loops", order: 11, level: 2, title: "Вложенные циклы",
    goals: ["Запустить цикл внутри цикла", "Нарисовать фигуру из символов", "Перебрать все пары значений"],
    introduces: [],
    taskType: "linear", modes: ["stdout"],
  },
  {
    id: "m09_lists", order: 12, level: 2, title: "Списки",
    goals: ["Создать список и обратиться к элементу", "Добавить элемент", "Перебрать список и посчитать сумму, минимум, максимум"],
    introduces: ["list", "method:append", "method:pop", "method:remove", "in", "call:sum", "call:min", "call:max", "call:sorted", "method:sort", "call:list"],
    taskType: "linear", modes: ["variable"],
  },
  {
    id: "m09a_list_algorithms", order: 13, level: 2, title: "Алгоритмы на списках",
    goals: ["Найти элемент и его позицию", "Найти максимум без max()", "Перевернуть и сдвинуть список", "Убрать повторы"],
    introduces: [],
    taskType: "linear", modes: ["variable"],
  },
  {
    id: "m09b_matrices", order: 14, level: 2, title: "Двумерные списки",
    goals: ["Обратиться к элементу таблицы по строке и столбцу", "Обойти таблицу двумя циклами", "Посчитать суммы по строкам и столбцам"],
    introduces: [],
    taskType: "linear", modes: ["variable"],
  },
  {
    id: "m10_string_methods", order: 15, level: 2, title: "Методы строк и срезы",
    goals: ["Изменить регистр и заменить часть строки", "Разбить строку на слова и собрать обратно", "Взять часть строки срезом"],
    introduces: ["slice", "method:split", "method:join", "method:upper", "method:lower", "method:replace", "method:strip", "method:count", "method:find", "method:startswith", "method:endswith", "method:isdigit", "method:isalpha", "method:isupper", "method:islower", "method:capitalize"],
    taskType: "linear", modes: ["variable"],
  },
  {
    id: "m10a_chars", order: 16, level: 2, title: "Символы и их коды: ord() и chr()",
    goals: ["Узнать код символа", "Получить символ по коду", "Сдвинуть буквы — шифр Цезаря"],
    introduces: ["call:ord", "call:chr"],
    taskType: "linear", modes: ["variable"],
  },
  {
    id: "m11_functions", order: 17, level: 3, title: "Функции",
    goals: ["Объявить функцию с параметрами", "Вернуть результат через return", "Разбить задачу на функции"],
    introduces: ["def", "return"],
    taskType: "function", modes: ["function"],
  },
  {
    id: "m12_dicts", order: 18, level: 3, title: "Словари",
    goals: ["Хранить пары «ключ — значение»", "Найти значение по ключу", "Посчитать, сколько раз встречается элемент"],
    introduces: ["dict", "call:dict", "method:get", "method:items", "method:keys", "method:values", "unpack"],
    taskType: "function", modes: ["function"],
  },
  {
    id: "m13_tuples_sets", order: 19, level: 3, title: "Кортежи и множества",
    goals: ["Вернуть несколько значений кортежем", "Убрать повторы через множество", "Найти общие элементы"],
    introduces: ["tuple", "set", "call:set", "call:tuple", "method:add", "call:enumerate", "call:zip"],
    taskType: "function", modes: ["function"],
  },
  {
    id: "m14_errors", order: 20, level: 3, title: "Ошибки и try/except",
    goals: ["Прочитать сообщение об ошибке", "Перехватить ошибку через try/except", "Проверить данные перед расчётом"],
    introduces: ["try", "raise", "call:isinstance"],
    taskType: "function", modes: ["function"],
  },
  {
    id: "m15_comprehensions", order: 21, level: 4, title: "Генераторы списков и словарей", extra: true,
    goals: ["Собрать список одной строкой", "Отфильтровать элементы", "Собрать словарь из пар"],
    introduces: ["comprehension", "ifexp"],
    taskType: "function", modes: ["function"],
  },
  {
    id: "m16_lambda", order: 22, level: 4, title: "lambda и встроенные функции", extra: true,
    goals: ["Сортировать по своему правилу", "Применить функцию к каждому элементу", "Проверить условие для всех элементов"],
    introduces: ["lambda", "kw:key", "kw:reverse", "call:map", "call:filter", "call:any", "call:all", "call:reversed"],
    taskType: "function", modes: ["function"],
  },
  {
    id: "m17_recursion", order: 23, level: 4, title: "Рекурсия", extra: true,
    goals: ["Понять базовый случай и шаг рекурсии", "Решить задачу через вызов функции из самой себя"],
    introduces: [],
    taskType: "function", modes: ["function"],
  },
  {
    id: "m18_files", order: 24, level: 4, title: "Работа с файлами", extra: true,
    goals: ["Прочитать текстовый файл", "Обработать файл построчно", "Записать результат в файл"],
    introduces: ["with", "call:open", "method:read", "method:readlines", "method:write", "method:splitlines"],
    taskType: "function", modes: ["function"],
  },
  {
    id: "m19_classes", order: 25, level: 4, title: "Классы и объекты", extra: true,
    goals: ["Описать класс с атрибутами", "Добавить методы", "Создать несколько объектов"],
    introduces: ["class"],
    taskType: "class", modes: ["class"],
  },
];

/** Every token any module introduces; tokens outside this set are not restricted. */
export const KNOWN_CONSTRUCTS = new Set(CURRICULUM.flatMap((module) => module.introduces));

export function getCurriculumModule(id: string): CurriculumModule | undefined {
  return CURRICULUM.find((module) => module.id === id);
}

/** Cumulative allowed constructs: everything introduced up to and including the module. */
export function allowedConstructs(moduleId: string): Set<string> {
  const module = getCurriculumModule(moduleId);
  if (!module) return new Set(KNOWN_CONSTRUCTS);
  return new Set(
    CURRICULUM.filter((item) => item.order <= module.order).flatMap((item) => item.introduces)
  );
}

/** XP by difficulty (PRD 9.1). */
export const XP_BY_DIFFICULTY = { easy: 10, medium: 20, hard: 30 } as const;
