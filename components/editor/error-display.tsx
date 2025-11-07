"use client";

import { AlertCircle, Info, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorDisplayProps {
  error: string;
  code?: string;
}

/**
 * Парсит ошибку Python и извлекает полезную информацию
 */
function parsePythonError(error: string): {
  type: string;
  message: string;
  line?: number;
  details?: string;
  hint?: string;
} {
  // Синтаксические ошибки
  const syntaxMatch = error.match(/SyntaxError:\s*(.+?)(?:\n|$)/);
  if (syntaxMatch) {
    const message = syntaxMatch[1].trim();
    const lineMatch = error.match(/line (\d+)/);
    const line = lineMatch ? Number.parseInt(lineMatch[1], 10) : undefined;
    
    let hint = "Проверьте правильность написания кода.";
    if (message.includes("invalid syntax")) {
      hint = "Возможно, вы забыли закрыть скобку, кавычку или двоеточие.";
    } else if (message.includes("unexpected EOF")) {
      hint = "Код не завершен. Проверьте, что все скобки и кавычки закрыты.";
    } else if (message.includes("invalid character")) {
      hint = "В коде есть недопустимый символ. Проверьте, нет ли лишних пробелов или специальных символов.";
    }
    
    return {
      type: "Синтаксическая ошибка",
      message,
      line,
      hint,
    };
  }

  // Ошибки времени выполнения
  const runtimeMatch = error.match(/(\w+Error):\s*(.+?)(?:\n|$)/);
  if (runtimeMatch) {
    const errorType = runtimeMatch[1];
    const message = runtimeMatch[2].trim();
    const lineMatch = error.match(/line (\d+)/);
    const line = lineMatch ? Number.parseInt(lineMatch[1], 10) : undefined;

    let hint = "";
    let typeName = errorType;

    switch (errorType) {
      case "NameError":
        typeName = "Ошибка имени";
        hint = "Переменная или функция с таким именем не найдена. Проверьте правильность написания имени.";
        break;
      case "TypeError":
        typeName = "Ошибка типа";
        hint = "Неправильный тип данных. Проверьте, что вы используете правильные типы (числа, строки, списки и т.д.).";
        break;
      case "ValueError":
        typeName = "Ошибка значения";
        hint = "Неправильное значение. Проверьте, что значение соответствует ожидаемому формату.";
        break;
      case "IndexError":
        typeName = "Ошибка индекса";
        hint = "Индекс выходит за границы списка или строки. Проверьте длину списка перед обращением к элементу.";
        break;
      case "KeyError":
        typeName = "Ошибка ключа";
        hint = "Ключ не найден в словаре. Проверьте, что ключ существует в словаре.";
        break;
      case "ZeroDivisionError":
        typeName = "Деление на ноль";
        hint = "Попытка разделить на ноль. Проверьте, что делитель не равен нулю.";
        break;
      case "AttributeError":
        typeName = "Ошибка атрибута";
        hint = "У объекта нет такого атрибута или метода. Проверьте правильность написания имени.";
        break;
      case "IndentationError":
        typeName = "Ошибка отступов";
        hint = "Неправильные отступы в коде. В Python отступы очень важны! Используйте одинаковое количество пробелов (обычно 4).";
        break;
      default:
        hint = "Произошла ошибка при выполнении кода. Проверьте логику вашего решения.";
    }

    return {
      type: typeName,
      message,
      line,
      hint,
    };
  }

  // Если не удалось распарсить - возвращаем как есть
  return {
    type: "Ошибка выполнения",
    message: error,
    hint: "Проверьте правильность написания кода и логику решения.",
  };
}

export function ErrorDisplay({ error, code }: ErrorDisplayProps) {
  const parsed = parsePythonError(error);

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {parsed.type}
        </CardTitle>
        {parsed.line && (
          <CardDescription>
            Ошибка на строке {parsed.line}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Сообщение об ошибке */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Что пошло не так?</AlertTitle>
          <AlertDescription>
            <pre className="text-sm whitespace-pre-wrap font-mono mt-2">
              {parsed.message}
            </pre>
          </AlertDescription>
        </Alert>

        {/* Подсказка */}
        {parsed.hint && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Подсказка</AlertTitle>
            <AlertDescription className="mt-2">
              {parsed.hint}
            </AlertDescription>
          </Alert>
        )}

        {/* Показываем строку с ошибкой, если есть код и номер строки */}
        {parsed.line && code && (
          <div className="rounded-md bg-muted p-4">
            <div className="text-sm font-medium mb-2">Код вокруг ошибки:</div>
            <pre className="text-xs font-mono overflow-x-auto">
              {code.split("\n").map((line, index) => {
                const lineNum = index + 1;
                const isErrorLine = lineNum === parsed.line;
                return (
                  <div
                    key={index}
                    className={isErrorLine ? "bg-destructive/20 px-2 py-1 rounded" : "px-2 py-1"}
                  >
                    <span className="text-muted-foreground mr-2">
                      {lineNum.toString().padStart(3, " ")}:
                    </span>
                    <span className={isErrorLine ? "text-destructive font-semibold" : ""}>
                      {line || " "}
                    </span>
                  </div>
                );
              })}
            </pre>
          </div>
        )}

        {/* Дополнительная информация */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Что делать дальше?</AlertTitle>
          <AlertDescription className="mt-2 space-y-1">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Внимательно прочитайте сообщение об ошибке</li>
              <li>Проверьте строку с ошибкой (если указана)</li>
              <li>Убедитесь, что все скобки, кавычки и двоеточия закрыты</li>
              <li>Проверьте правильность написания имен переменных и функций</li>
              <li>Используйте подсказку выше для более детальной информации</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

