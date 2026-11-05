/**
 * Python AST analyzer that lists the constructs a piece of code uses, in the
 * token format of lib/curriculum.ts. Runs inside Pyodide:
 *   pyodide.runPython(ANALYZER_SETUP); pyodide.runPython(`_cs_features(${JSON.stringify(code)})`)
 * returns a JSON array of tokens.
 */
export const ANALYZER_SETUP = `
import ast as _cs_ast
import json as _cs_json

_CS_BUILTINS = {
    "print", "input", "int", "float", "str", "bool", "len", "range", "round", "abs",
    "sum", "min", "max", "sorted", "list", "dict", "set", "tuple", "enumerate", "zip",
    "map", "filter", "any", "all", "reversed", "open", "isinstance",
}

def _cs_features(code):
    tree = _cs_ast.parse(code)
    found = set()
    for node in _cs_ast.walk(tree):
        if isinstance(node, _cs_ast.Call):
            if isinstance(node.func, _cs_ast.Name) and node.func.id in _CS_BUILTINS:
                found.add("call:" + node.func.id)
            elif isinstance(node.func, _cs_ast.Attribute):
                found.add("method:" + node.func.attr)
            for keyword in node.keywords:
                if keyword.arg:
                    found.add("kw:" + keyword.arg)
        elif isinstance(node, _cs_ast.If):
            found.add("if")
            if len(node.orelse) == 1 and isinstance(node.orelse[0], _cs_ast.If):
                found.add("elif")
        elif isinstance(node, _cs_ast.IfExp):
            found.add("ifexp")
        elif isinstance(node, _cs_ast.While):
            found.add("while")
        elif isinstance(node, _cs_ast.For):
            found.add("for")
        elif isinstance(node, _cs_ast.Break):
            found.add("break")
        elif isinstance(node, _cs_ast.Continue):
            found.add("continue")
        elif isinstance(node, _cs_ast.AugAssign):
            found.add("augassign")
        elif isinstance(node, (_cs_ast.FunctionDef, _cs_ast.AsyncFunctionDef)):
            found.add("def")
        elif isinstance(node, _cs_ast.Return):
            found.add("return")
        elif isinstance(node, _cs_ast.Lambda):
            found.add("lambda")
        elif isinstance(node, (_cs_ast.ListComp, _cs_ast.SetComp, _cs_ast.DictComp, _cs_ast.GeneratorExp)):
            found.add("comprehension")
        elif isinstance(node, _cs_ast.Try):
            found.add("try")
        elif isinstance(node, _cs_ast.Raise):
            found.add("raise")
        elif isinstance(node, _cs_ast.ClassDef):
            found.add("class")
        elif isinstance(node, _cs_ast.With):
            found.add("with")
        elif isinstance(node, (_cs_ast.Import, _cs_ast.ImportFrom)):
            found.add("import")
        elif isinstance(node, (_cs_ast.Global, _cs_ast.Nonlocal)):
            found.add("global")
        elif isinstance(node, _cs_ast.List):
            found.add("list")
        elif isinstance(node, _cs_ast.Dict):
            found.add("dict")
        elif isinstance(node, _cs_ast.Set):
            found.add("set")
        elif isinstance(node, _cs_ast.Tuple):
            found.add("tuple")
        elif isinstance(node, _cs_ast.JoinedStr):
            found.add("fstring")
        elif isinstance(node, _cs_ast.Subscript):
            found.add("slice" if isinstance(node.slice, _cs_ast.Slice) else "index")
        elif isinstance(node, _cs_ast.BoolOp):
            found.add("and" if isinstance(node.op, _cs_ast.And) else "or")
        elif isinstance(node, _cs_ast.UnaryOp) and isinstance(node.op, _cs_ast.Not):
            found.add("not")
        elif isinstance(node, _cs_ast.Compare):
            found.add("compare")
            if any(isinstance(op, (_cs_ast.In, _cs_ast.NotIn)) for op in node.ops):
                found.add("in")
    return _cs_json.dumps(sorted(found))
`;

/** Constructs never allowed in course solutions. */
export const FORBIDDEN_CONSTRUCTS = new Set(["import", "global"]);
