// Execução REAL de código em Web Workers (Pyodide para Python, Worker isolado para JS).
export type Lang = "python" | "javascript";
export type Stream = "stdout" | "stderr" | "info";
export type OutChunk = { stream: Stream; text: string };
export type RunStatus = "ok" | "error" | "timeout" | "stopped" | "unavailable";
export type RunResult = { status: RunStatus; stdout: string; stderr: string; durationMs: number };
export type PyStatus = "idle" | "loading" | "ready" | "failed";

export const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const PY_WORKER = `
importScripts("${PYODIDE_URL}pyodide.js");
let py = null;
const ready = loadPyodide({ indexURL: "${PYODIDE_URL}" })
  .then((p) => { py = p; postMessage({ type: "ready" }); })
  .catch((e) => postMessage({ type: "loadError", error: String(e && e.message || e) }));
function clean(msg) {
  const lines = String(msg).split("\\n");
  const i = lines.findIndex((l) => l.includes('File "<exec>"'));
  if (i === -1) return msg;
  return ["Traceback (most recent call last):", ...lines.slice(i)].join("\\n");
}
onmessage = async (e) => {
  const { id, code, stdin } = e.data;
  await ready;
  if (!py) { postMessage({ type: "done", id, ok: false }); return; }
  const lines = stdin ? String(stdin).replace(/\\r\\n/g, "\\n").split("\\n") : [];
  let i = 0;
  py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) });
  py.setStdout({ batched: (s) => postMessage({ type: "out", id, stream: "stdout", text: s + "\\n" }) });
  py.setStderr({ batched: (s) => postMessage({ type: "out", id, stream: "stderr", text: s + "\\n" }) });
  const ns = py.globals.get("dict")();
  try {
    await py.runPythonAsync(code, { globals: ns });
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
    const fn = new Function('"use strict"; return (async () => {\\n' + e.data.code + '\\n})()');
    await fn();
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
  return new Worker(url);
}

let pyWorker: Worker | null = null;
let pyReady: Promise<void> | null = null;
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
    const h = (e: MessageEvent) => {
      if (e.data.type === "ready") { w.removeEventListener("message", h); setPy("ready"); resolve(); }
      if (e.data.type === "loadError") { w.removeEventListener("message", h); pyError = e.data.error; setPy("failed"); reject(new Error(e.data.error)); }
    };
    w.addEventListener("message", h);
    w.onerror = (ev) => { pyError = ev.message || "Falha ao baixar o Pyodide (verifique sua conexão)."; setPy("failed"); reject(new Error(pyError)); };
  });
  pyReady.catch(() => {});
  return pyReady;
}

function killPython() {
  pyWorker?.terminate();
  pyWorker = null;
  pyReady = null;
  setPy("idle");
}

let current: { cancel: () => void } | null = null;
let seq = 0;
export function stopCurrent() { current?.cancel(); }

export async function runCode(
  lang: Lang,
  code: string,
  opts: { stdin?: string; timeoutMs: number; onChunk?: (c: OutChunk) => void },
): Promise<RunResult> {
  current?.cancel();
  let worker: Worker;
  if (lang === "python") {
    try { await ensurePython(); } catch {
      return { status: "unavailable", stdout: "", stderr: "", durationMs: 0 };
    }
    worker = pyWorker!;
  } else {
    worker = makeWorker(JS_WORKER);
  }
  const id = ++seq;
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
      current = null;
      resolve({ status, stdout, stderr, durationMs: Math.round(performance.now() - t0) });
    };
    const h = (e: MessageEvent) => {
      const d = e.data;
      if (d.id !== id) return;
      if (d.type === "out") {
        if (d.stream === "stdout") stdout += d.text; else stderr += d.text;
        opts.onChunk?.({ stream: d.stream, text: d.text });
      } else if (d.type === "done") finish(d.ok ? "ok" : "error");
    };
    worker.addEventListener("message", h);
    const kill = () => { if (lang === "python") killPython(); else worker.terminate(); };
    const timer = setTimeout(() => { kill(); finish("timeout"); }, opts.timeoutMs);
    current = { cancel: () => { kill(); finish("stopped"); } };
    worker.postMessage({ id, code, stdin: opts.stdin ?? "" });
  });
}

/** Normaliza saída para comparação: CRLF→LF, espaços no fim das linhas e quebras finais. */
export function normalizeOutput(s: string) {
  return s.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
}

/** Encerra e descarta o worker Python; o próximo Executar recria do zero. */
export function resetPython() { current?.cancel(); killPython(); }