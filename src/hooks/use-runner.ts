import { useCallback, useState, useSyncExternalStore } from "react";
import { getPyStatus, runCode, stopCurrent, subscribePy, ensurePython, getPyError, type Lang, type OutChunk, type RunResult } from "@/lib/runtime";

export function usePyStatus() {
  return useSyncExternalStore(subscribePy, getPyStatus, () => "idle" as const);
}

const STATUS_MSG: Record<string, string> = {
  timeout: "⏱ Tempo limite atingido: execução interrompida (o worker foi encerrado e será recriado).",
  stopped: "■ Execução interrompida por você. O ambiente será recriado no próximo Executar.",
  unavailable: "✖ Execução Python indisponível: o Pyodide não carregou. Nenhum resultado foi gerado.",
};

export function useRunner() {
  const [chunks, setChunks] = useState<OutChunk[]>([]);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<RunResult | null>(null);

  const run = useCallback(async (lang: Lang, code: string, opts: { stdin?: string; timeoutMs: number }) => {
    setChunks([]); setRunning(true); setLast(null);
    const res = await runCode(lang, code, { ...opts, onChunk: (c) => setChunks((p) => [...p, c]) });
    if (STATUS_MSG[res.status]) {
      const extra = res.status === "unavailable" && getPyError() ? `\nDetalhe: ${getPyError()}` : "";
      setChunks((p) => [...p, { stream: "info", text: STATUS_MSG[res.status] + extra + "\n" }]);
    }
    setLast(res); setRunning(false);
    return res;
  }, []);

  return { chunks, setChunks, running, last, run, stop: stopCurrent, preload: () => ensurePython().catch(() => {}) };
}

export const footerFor = (r: RunResult | null) =>
  r ? `${r.status === "ok" ? "✔ Concluído" : r.status === "error" ? "✖ Terminou com erro" : "Encerrado"} · ${r.durationMs} ms` : undefined;