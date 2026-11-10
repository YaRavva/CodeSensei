"use client";

/**
 * Web Worker редактора Monaco.
 *
 * Turbopack собирает `monaco-editor` так, что её worker-файл попадает в
 * `/_next/static/media/` отдельным чанком с относительными импортами. Из
 * blob-URL, откуда Monaco запускает worker, такие импорты не разрешаются
 * ("Failed to resolve module specifier ... editorWebWorkerMain.js"), и воркер
 * не стартует. Из-за этого падали подсказки по словам, ссылки и подсветка
 * Unicode, а вместе с ними — ввод в редакторе.
 *
 * Этот файл импортирует worker Monaco напрямую, поэтому бандлер собирает его
 * как самодостаточный модуль и воркер запускается штатно.
 */
import { bootstrapWebWorker } from "monaco-editor/base/common/worker/webWorkerBootstrap";
import { EditorWorker } from "monaco-editor/editor/common/services/editorWebWorker";

bootstrapWebWorker(() => new EditorWorker(null));
