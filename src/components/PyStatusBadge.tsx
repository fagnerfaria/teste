import { usePyStatus } from "@/hooks/use-runner";
import { ensurePython, PYODIDE_VERSION } from "@/lib/runtime";

export function PyStatusBadge() {
  const s = usePyStatus();
  const map = {
    idle: ["Python não carregado", "bg-muted text-muted-foreground"],
    loading: ["Carregando Python (Pyodide)…", "bg-warning/20"],
    ready: [`Python ${PYODIDE_VERSION === "0.28.3" ? "3.13" : ""} pronto`, "bg-success/20"],
    failed: ["Falha ao carregar Python", "bg-destructive/15 text-destructive"],
  } as const;
  const [label, cls] = map[s];
  return (
    <span className={`inline-flex items-center gap-2 rounded px-2 py-0.5 text-xs font-semibold ${cls}`} role="status">
      {s === "loading" && <span className="size-2 animate-pulse rounded-full bg-warning" />}
      {label}
      {s === "failed" && <button className="underline" onClick={() => ensurePython().catch(() => {})}>Tentar novamente</button>}
    </span>
  );
}