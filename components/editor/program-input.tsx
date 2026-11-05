"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Splits the "program input" text into the lines returned by input(). */
export function parseProgramInput(text: string): string[] {
  if (!text) return [];
  return text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
}

/** Default input text for a task: stdin of the first test case. */
export function defaultProgramInput(testCases: { stdin?: string[] }[] | undefined): string {
  return testCases?.[0]?.stdin?.join("\n") ?? "";
}

/** True when the program reads input and the field should be shown. */
export function usesProgramInput(code: string, defaultInput: string): boolean {
  return Boolean(defaultInput) || /\binput\s*\(/.test(code);
}

export function ProgramInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Ввод программы</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="font-mono text-sm"
        placeholder="Каждая строка — ответ на один вызов input()"
      />
      <p className="text-xs text-muted-foreground">
        Каждая строка — это то, что программа получит при очередном вызове <code>input()</code>.
      </p>
    </div>
  );
}
