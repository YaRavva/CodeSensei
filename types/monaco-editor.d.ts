/**
 * Декларации внутренних модулей Monaco Editor.
 *
 * Пакет monaco-editor не публикует типы для служебных модулей worker'а, но они
 * нужны для собственного worker-файла редактора.
 */
declare module "monaco-editor/base/common/worker/webWorkerBootstrap" {
  export function bootstrapWebWorker(
    createWorker: (ctx: unknown, createData: unknown) => unknown
  ): void;
}

declare module "monaco-editor/editor/common/services/editorWebWorker" {
  export class EditorWorker {
    constructor(ctx: unknown);
  }
}
