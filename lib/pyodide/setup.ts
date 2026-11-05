/**
 * Python-side setup shared by the browser (hooks/use-pyodide.ts) and the
 * content validator (scripts/content/validate.ts), so both run student code
 * the same way.
 */

export const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

/** Captures print() output into _stdout_capture. */
export const STDOUT_SETUP = `
import sys
from io import StringIO

class PyodideStdout:
    def __init__(self):
        self.buffer = StringIO()

    def write(self, s):
        if s:
            self.buffer.write(s)

    def flush(self):
        pass

    def getvalue(self):
        return self.buffer.getvalue()

    def reset(self):
        self.buffer = StringIO()

_stdout_capture = PyodideStdout()
sys.stdout = _stdout_capture
`;

/**
 * input() support. By default Pyodide answers input() with window.prompt(),
 * which blocks the page, hides the prompt text and pops up for every call in
 * every test. Instead input() reads prepared lines: the "program input" field
 * when running, test_case.stdin when testing.
 */
export const INPUT_SETUP = `
import builtins

_cs_stdin_lines = []
_cs_stdin_pos = 0
_cs_echo_input = True

def _cs_set_stdin(lines, echo=True):
    global _cs_stdin_lines, _cs_stdin_pos, _cs_echo_input
    _cs_stdin_lines = [str(line) for line in (lines or [])]
    _cs_stdin_pos = 0
    _cs_echo_input = echo

def _cs_input(prompt=""):
    global _cs_stdin_pos
    if _cs_stdin_pos >= len(_cs_stdin_lines):
        raise EOFError("Программа запросила больше данных, чем указано во вводе. Добавьте строку в поле «Ввод программы».")
    value = _cs_stdin_lines[_cs_stdin_pos]
    _cs_stdin_pos += 1
    # When running, show the prompt and the typed value like a console does.
    # In tests the prompt is not part of the checked output.
    if _cs_echo_input:
        print(f"{prompt}{value}")
    return value

builtins.input = _cs_input
`;

interface PythonRunner {
  runPython: (code: string) => unknown;
}

export function setupPyodide(pyodide: PythonRunner): void {
  pyodide.runPython(STDOUT_SETUP);
  pyodide.runPython(INPUT_SETUP);
}
