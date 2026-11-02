// Execução REAL de código em Web Workers (Pyodide para Python, Worker isolado para JS).
export type Lang = "python" | "javascript";
export type Stream = "stdout" | "stderr" | "info";
export type OutChunk = { stream: Stream; text: string };
export type RunStatus = "ok" | "error" | "timeout" | "stopped" | "unavailable";
export type RunResult = { status: RunStatus; stdout: string; stderr: string; durationMs: number };
export type PyStatus = "idle" | "loading" | "ready" | "failed";

export const PYODIDE_VERSION = "0.28.3";
const PYODIDE_URL = typeof location === "undefined" ? "/vendor/pyodide/" : new URL("/vendor/pyodide/", location.origin).href;
const PYODIDE_PACKAGE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const PY_WORKER = `
importScripts("${PYODIDE_URL}pyodide.js");
let py = null;
const ready = loadPyodide({ indexURL: "${PYODIDE_URL}", packageBaseUrl: "${PYODIDE_PACKAGE_URL}" })
  .then((p) => { py = p; postMessage({ type: "ready" }); })
  .catch((e) => postMessage({ type: "loadError", error: String(e && e.message || e) }));
function clean(msg) {
  const lines = String(msg).split("\\n");
  const i = lines.findIndex((l) => l.includes('File "<exec>"'));
  if (i === -1) return msg;
  return ["Traceback (most recent call last):", ...lines.slice(i)].join("\\n");
}
onmessage = async (e) => {
  const { id, code, stdin, project } = e.data;
  await ready;
  if (!py) { postMessage({ type: "done", id, ok: false }); return; }
  const lines = stdin ? String(stdin).replace(/\\r\\n/g, "\\n").split("\\n") : [];
  let i = 0;
  py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) });
  py.setStdout({ batched: (s) => postMessage({ type: "out", id, stream: "stdout", text: s + "\\n" }) });
  py.setStderr({ batched: (s) => postMessage({ type: "out", id, stream: "stderr", text: s + "\\n" }) });
  const ns = py.globals.get("dict")();
  try {
    const root = "/home/pyodide/codigolab";
    function remove(path) {
      if (!py.FS.analyzePath(path).exists) return;
      for (const name of py.FS.readdir(path)) if (name !== "." && name !== "..") {
        const item = path + "/" + name;
        if (py.FS.isDir(py.FS.stat(item).mode)) remove(item); else py.FS.unlink(item);
      }
      py.FS.rmdir(path);
    }
    py.FS.chdir("/home/pyodide");
    remove(root); py.FS.mkdirTree(root);
    await py.runPythonAsync("import sys, os, importlib\\nfor name, module in list(sys.modules.items()):\\n    if str(getattr(module, '__file__', '')).startswith('/home/pyodide/codigolab/'):\\n        del sys.modules[name]\\nif '/home/pyodide/codigolab' not in sys.path: sys.path.insert(0, '/home/pyodide/codigolab')\\nimportlib.invalidate_caches()\\nos.chdir('/home/pyodide/codigolab')");
    if (project) {
      for (const [path, content] of Object.entries(project.files)) {
        const directory = path.split("/").slice(0,-1).join("/");
        if (directory) py.FS.mkdirTree(root + "/" + directory);
        py.FS.writeFile(root + "/" + path, content, { encoding: "utf8" });
      }
      if (project.packages.length) {
        postMessage({ type: "out", id, stream: "info", text: "Carregando dependências: " + project.packages.join(", ") + "\\n" });
        await py.loadPackage(project.packages);
      }
    }
    ns.set("__name__", "__main__");
    ns.set("__file__", root + "/" + (project ? project.entry : "main.py"));
    postMessage({ type: "started", id });
    await py.runPythonAsync(code, { globals: ns, filename: project ? root + "/" + project.entry : "<exec>" });
    postMessage({ type: "done", id, ok: true });
  } catch (err) {
    postMessage({ type: "out", id, stream: "stderr", text: clean(err.message) + "\\n" });
    postMessage({ type: "done", id, ok: false });
  } finally { try { ns.destroy(); } catch (_) {} }
};
`;

const JS_WORKER = `
const fmt = (v) => { if (typeof v === "string") return v; try { return typeof v === "object" ? JSON.stringify(v) : String(v); } catch (_) { return String(v); } };
let id = 0;
const send = (stream, args) => postMessage({ type: "out", id, stream, text: args.map(fmt).join(" ") + "\\n" });
console.log = (...a) => send("stdout", a); console.info = console.log;
console.warn = (...a) => send("stderr", a); console.error = console.warn;
const pending = new Set(); const _st = setTimeout, _ct = clearTimeout, _si = setInterval, _ci = clearInterval;
self.setTimeout = (fn, ms, ...r) => { const h = _st(() => { pending.delete(h); try { fn(...r); } catch (e) { send("stderr", [String(e)]); } }, ms); pending.add(h); return h; };
self.clearTimeout = (h) => { pending.delete(h); _ct(h); };
self.setInterval = (fn, ms, ...r) => { const h = _si(() => { try { fn(...r); } catch (e) { send("stderr", [String(e)]); } }, ms); pending.add(h); return h; };
self.clearInterval = (h) => { pending.delete(h); _ci(h); };
onmessage = async (e) => {
  id = e.data.id;
  try {
    if (e.data.module) {
      const url = URL.createObjectURL(new Blob([e.data.code], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
    } else {
    const fn = new Function('"use strict"; return (async () => {\\n' + e.data.code + '\\n})()');
    await fn();
    }
    while (pending.size) await new Promise((r) => _st(r, 20));
    postMessage({ type: "done", id, ok: true });
  } catch (err) {
    send("stderr", [(err && err.name ? err.name + ": " : "") + (err && err.message || String(err))]);
    postMessage({ type: "done", id, ok: false });
  }
};
`;

function makeWorker(src: string) {
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

let pyWorker: Worker | null = null;
let pyReady: Promise<void> | null = null;
let pyLoadTimer: ReturnType<typeof setTimeout> | undefined;
let rejectPyReady: ((reason?: unknown) => void) | null = null;
let pyStatus: PyStatus = "idle";
let pyError = "";
const listeners = new Set<() => void>();
const setPy = (s: PyStatus) => { pyStatus = s; listeners.forEach((l) => l()); };
export const subscribePy = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getPyStatus = () => pyStatus;
export const getPyError = () => pyError;

export function ensurePython(): Promise<void> {
  if (pyReady && pyStatus !== "failed") return pyReady;
  setPy("loading");
  pyWorker?.terminate();
  const w = makeWorker(PY_WORKER);
  pyWorker = w;
  pyReady = new Promise<void>((resolve, reject) => {
    rejectPyReady = reject;
    const deadline = pyLoadTimer = setTimeout(() => { w.terminate(); pyError = "O carregamento do Python excedeu 90 segundos. Tente novamente."; setPy("failed"); reject(new Error(pyError)); }, 90000);
    const h = (e: MessageEvent) => {
      if (e.data.type === "ready") { clearTimeout(deadline); rejectPyReady=null; w.removeEventListener("message", h); setPy("ready"); resolve(); }
      if (e.data.type === "loadError") { clearTimeout(deadline); rejectPyReady=null; w.removeEventListener("message", h); pyError = e.data.error; setPy("failed"); reject(new Error(e.data.error)); }
    };
    w.addEventListener("message", h);
    w.onerror = (ev) => { clearTimeout(deadline); rejectPyReady=null; pyError = ev.message || "Falha ao baixar o Pyodide (verifique sua conexão)."; setPy("failed"); reject(new Error(pyError)); };
  });
  pyReady.catch(() => {});
  return pyReady;
}

function killPython() {
  clearTimeout(pyLoadTimer);
  rejectPyReady?.(new Error("Carregamento interrompido."));
  rejectPyReady = null;
  pyWorker?.terminate();
  pyWorker = null;
  pyReady = null;
  setPy("idle");
}

let current: { cancel: () => void } | null = null;
let seq = 0;
export function stopCurrent() { ++seq; current?.cancel(); }

export type RunOptions = {
 stdin?: string | undefined;
 timeoutMs: number;
 onChunk?: (c: OutChunk) => void;
 module?: boolean;
 project?: { entry: string; files: Record<string,string>; packages: string[] };
};

export async function runCode(
  lang: Lang,
  code: string,
  opts: RunOptions,
): Promise<RunResult> {
  current?.cancel();
  const generation = ++seq;
  let stopped = false;
  current = { cancel: () => { stopped = true; if (lang === "python") killPython(); } };
  let worker: Worker;
  if (lang === "python") {
    try { await ensurePython(); } catch {
      return { status: stopped ? "stopped" : "unavailable", stdout: "", stderr: getPyError(), durationMs: 0 };
    }
    if (generation !== seq || stopped) return { status: "stopped", stdout: "", stderr: "", durationMs: 0 };
    worker = pyWorker!;
  } else {
    worker = makeWorker(JS_WORKER);
  }
  const id = generation;
  let stdout = "", stderr = "";
  const t0 = performance.now();
  return new Promise<RunResult>((resolve) => {
    let finished = false;
    const finish = (status: RunStatus) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker.removeEventListener("message", h);
      if (lang === "javascript") worker.terminate();
      if (generation === seq) current = null;
      resolve({ status, stdout, stderr, durationMs: Math.round(performance.now() - t0) });
    };
    const h = (e: MessageEvent) => {
      const d = e.data;
      if (d.id !== id) return;
      if (d.type === "out") {
        if (stdout.length + stderr.length + String(d.text).length > 200000) {
          const message = "Saída interrompida: limite de 200 mil caracteres.\n";
          stderr += message;
          opts.onChunk?.({ stream: "stderr", text: message });
          kill(); finish("error"); return;
        }
        if (d.stream === "stdout") stdout += d.text; else if (d.stream === "stderr") stderr += d.text;
        opts.onChunk?.({ stream: d.stream, text: d.text });
      } else if (d.type === "started" && waitingForPackages) { waitingForPackages = false; clearTimeout(timer); timer = setTimeout(() => { kill(); finish("timeout"); }, opts.timeoutMs);
      } else if (d.type === "done") finish(d.ok ? "ok" : "error");
    };
    worker.addEventListener("message", h);
    worker.onerror = (event) => { stderr += event.message || "Falha no executor."; kill(); finish("error"); };
    const kill = () => { if (lang === "python") killPython(); else worker.terminate(); };
    let waitingForPackages = !!opts.project?.packages.length;
    let timer = setTimeout(() => { kill(); finish("timeout"); }, waitingForPackages ? 90000 : opts.timeoutMs);
    current = { cancel: () => { kill(); finish("stopped"); } };
    worker.postMessage({ id, code, stdin: opts.stdin ?? "", project: opts.project, module: opts.module });
  });
}

/** Normaliza saída para comparação: CRLF→LF, espaços no fim das linhas e quebras finais. */
export function normalizeOutput(s: string) {
  return s.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
}

/** Encerra e descarta o worker Python; o próximo Executar recria do zero. */
export function resetPython() { current?.cancel(); killPython(); }