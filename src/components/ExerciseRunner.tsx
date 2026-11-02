import { useEffect, useRef, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { Terminal } from "./Terminal";
import { PyStatusBadge } from "./PyStatusBadge";
import { useRunner, footerFor } from "@/hooks/use-runner";
import { runCode, stopCurrent } from "@/lib/runtime";
import { assessExercise, type CaseResult } from "@/lib/assessment";
import { getData, recordAttempt, saveDraft, useData } from "@/lib/store";
import { explainError } from "@/lib/content/glossary";
import type { Exercise } from "@/lib/content/exercises";

export function ExerciseRunner({ ex }: { ex: Exercise }) {
  const data = useData();
  const draftKey = `ex:${ex.id}`;
  const [code, setCode] = useState(() => getData().drafts[draftKey] ?? ex.starter);
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { if (controller.current) { controller.current.abort(); stopCurrent(); } }, []);
  const [showHint, setShowHint] = useState(false);
  const [showSol, setShowSol] = useState(false);
  const r = useRunner();
  const passed = !!data.passedExercises[ex.id];

  const change = (v: string) => { if (checking) { controller.current?.abort(); stopCurrent(); } setResults(null); setVerdict(""); setCode(v); saveDraft(draftKey, v); };

  const check = async () => {
    setChecking(true); setResults(null); setVerdict("");
    const active = new AbortController(); controller.current = active;
    try {
      const report = await assessExercise(ex, code, { timeoutMs: data.timeoutMs, run: runCode, signal: active.signal });
      if (!active.signal.aborted) { setResults(report.results); setVerdict(report.verdict); }
      if (report.verdict === "passed" || report.verdict === "failed") recordAttempt(ex.id, report.verdict === "passed");
    } finally { if (controller.current === active) controller.current = null; setChecking(false); }
  };

  const allOk = verdict === "passed";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold">Nível {ex.level}</span>
        {passed && <span className="rounded bg-success px-2 py-0.5 text-xs font-bold text-success-foreground">✔ Resolvido</span>}
        <PyStatusBadge />
      </div>
      <p>{ex.prompt}</p>
      <CodeEditor value={code} onChange={change} lang={ex.lang ?? "python"} label={`Código do exercício ${ex.title}`} minHeight={160} />
      <p className="text-xs text-muted-foreground">Rascunho salvo automaticamente neste dispositivo.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={checking || r.running} onClick={check}>{checking ? "Corrigindo…" : "✓ Corrigir (executa de verdade)"}</button>
        <button className="btn btn-ghost" disabled={checking || r.running} onClick={() => r.run(ex.lang ?? "python", code, { stdin: ex.tests[0]?.stdin, timeoutMs: data.timeoutMs })}>▶ Só executar</button>
        {(checking || r.running) && <button className="btn btn-danger" onClick={() => { controller.current?.abort(); stopCurrent(); if (checking) setVerdict("stopped"); }}>■ Parar</button>}
        <button className="btn btn-ghost" onClick={() => setShowHint(!showHint)}>💡 Dica</button>
        <button className="btn btn-ghost" onClick={() => change(ex.starter)}>Reiniciar código</button>
      </div>
      {showHint && <p className="rounded-md bg-accent/30 p-2 text-sm">{ex.hint}</p>}
      {verdict === "stopped" && <p role="status">Correção interrompida. Nenhuma aprovação foi registrada.</p>}
      {verdict === "unavailable" && <p role="status">Executor indisponível. Nenhuma aprovação foi registrada; verifique a conexão e tente novamente.</p>}
      {(r.chunks.length > 0 || r.running) && <Terminal chunks={r.chunks} footer={footerFor(r.last)} />}
      {results && results.length > 0 && (
        <div className={`space-y-2 rounded-lg border-2 p-3 ${allOk ? "border-success bg-success/10" : "border-destructive bg-destructive/5"}`} aria-live="polite">
          <p className="font-bold">{allOk ? "🎉 Todos os casos passaram! Exercício resolvido." : `✖ ${results.filter((c) => !c.ok).length} de ${results.length} caso(s) falharam.`}</p>
          {results.map((c, i) => (
            <details key={i} open={!c.ok} className="rounded bg-card p-2 text-sm">
              <summary className="cursor-pointer font-semibold">{c.ok ? "✔" : "✖"} {c.label}</summary>
              {c.status === "unavailable" && <p className="text-destructive">Executor indisponível — não foi possível corrigir.</p>}
              {c.status === "timeout" && <p className="text-destructive">Tempo limite: talvez um laço infinito ou input() a mais.</p>}
              {!c.ok && c.status !== "unavailable" && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><div className="text-xs font-bold text-muted-foreground">Esperado</div><pre className="whitespace-pre-wrap rounded bg-muted p-2">{c.expected || "(vazio)"}</pre></div>
                  <div><div className="text-xs font-bold text-muted-foreground">Obtido</div><pre className="whitespace-pre-wrap rounded bg-muted p-2">{c.got || "(vazio)"}</pre></div>
                  {<p className="sm:col-span-2">{c.feedback}</p>}
                  {c.stderr && <pre className="whitespace-pre-wrap rounded bg-terminal p-2 text-terminal-error sm:col-span-2">{c.stderr}</pre>}
                  {c.stderr && explainError(c.stderr) && <p className="sm:col-span-2"><strong>Dica:</strong> {explainError(c.stderr)}</p>}
                </div>
              )}
            </details>
          ))}
          <p className="text-xs text-muted-foreground">A correção executa todas as entradas, incluindo casos de borda nos exercícios introdutórios. Função, variáveis e arquivo são verificados quando pedidos. Os testes são públicos no navegador e não certificam autoria, eficiência ou segurança.</p>
        </div>
      )}
      <div>
        {!showSol ? (
          <button className="btn btn-ghost text-sm" onClick={() => { if (passed || confirm("Ver a solução agora? Tente mais um pouco antes — errar faz parte do aprendizado.")) setShowSol(true); }}>
            Ver solução comentada
          </button>
        ) : (
          <div className="card-surface space-y-2 p-3">
            <pre className="overflow-auto rounded bg-muted p-2 text-sm">{ex.solution}</pre>
            <p className="text-sm">{ex.solutionNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
