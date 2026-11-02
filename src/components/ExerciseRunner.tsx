import { useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { Terminal } from "./Terminal";
import { PyStatusBadge } from "./PyStatusBadge";
import { useRunner, footerFor } from "@/hooks/use-runner";
import { normalizeOutput, runCode, type RunStatus } from "@/lib/runtime";
import { getData, recordAttempt, saveDraft, useData } from "@/lib/store";
import { explainError } from "@/lib/content/glossary";
import type { Exercise } from "@/lib/content/exercises";

type CaseResult = { label: string; ok: boolean; expected: string; got: string; stderr: string; status: RunStatus };

export function ExerciseRunner({ ex }: { ex: Exercise }) {
  const data = useData();
  const draftKey = `ex:${ex.id}`;
  const [code, setCode] = useState(() => getData().drafts[draftKey] ?? ex.starter);
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSol, setShowSol] = useState(false);
  const r = useRunner();
  const passed = !!data.passedExercises[ex.id];

  const change = (v: string) => { setCode(v); saveDraft(draftKey, v); };

  const check = async () => {
    setChecking(true); setResults(null);
    const out: CaseResult[] = [];
    for (const [i, t] of ex.tests.entries()) {
      const res = await runCode("python", code, { stdin: t.stdin, timeoutMs: data.timeoutMs });
      const got = normalizeOutput(res.stdout), expected = normalizeOutput(t.expected);
      out.push({ label: t.stdin ? `Caso ${i + 1} (entrada: ${t.stdin.replace(/\n/g, " ⏎ ")})` : `Caso ${i + 1}`, ok: res.status === "ok" && got === expected, expected, got, stderr: res.stderr, status: res.status });
      if (res.status === "unavailable") break;
    }
    setResults(out);
    if (!out.some((c) => c.status === "unavailable")) recordAttempt(ex.id, out.every((c) => c.ok));
    setChecking(false);
  };

  const allOk = results?.every((c) => c.ok);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold">Nível {ex.level}</span>
        {passed && <span className="rounded bg-success px-2 py-0.5 text-xs font-bold text-success-foreground">✔ Resolvido</span>}
        <PyStatusBadge />
      </div>
      <p>{ex.prompt}</p>
      <CodeEditor value={code} onChange={change} lang="python" label={`Código do exercício ${ex.title}`} minHeight={160} />
      <p className="text-xs text-muted-foreground">Rascunho salvo automaticamente neste dispositivo.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={checking || r.running} onClick={check}>{checking ? "Corrigindo…" : "✓ Corrigir (executa de verdade)"}</button>
        <button className="btn btn-ghost" disabled={checking || r.running} onClick={() => r.run("python", code, { stdin: ex.tests[0]?.stdin, timeoutMs: data.timeoutMs })}>▶ Só executar</button>
        {(checking || r.running) && <button className="btn btn-danger" onClick={r.stop}>■ Parar</button>}
        <button className="btn btn-ghost" onClick={() => setShowHint(!showHint)}>💡 Dica</button>
        <button className="btn btn-ghost" onClick={() => change(ex.starter)}>Reiniciar código</button>
      </div>
      {showHint && <p className="rounded-md bg-accent/30 p-2 text-sm">{ex.hint}</p>}
      {(r.chunks.length > 0 || r.running) && <Terminal chunks={r.chunks} footer={footerFor(r.last)} />}
      {results && (
        <div className={`space-y-2 rounded-lg border-2 p-3 ${allOk ? "border-success bg-success/10" : "border-destructive bg-destructive/5"}`} aria-live="polite">
          <p className="font-bold">{allOk ? "🎉 Todos os casos passaram! Exercício resolvido." : `✖ ${results.filter((c) => !c.ok).length} de ${results.length} caso(s) falharam.`}</p>
          {results.map((c, i) => (
            <details key={i} open={!c.ok} className="rounded bg-card p-2 text-sm">
              <summary className="cursor-pointer font-semibold">{c.ok ? "✔" : "✖"} {c.label}</summary>
              {c.status === "unavailable" && <p className="text-destructive">Python indisponível — não foi possível corrigir.</p>}
              {c.status === "timeout" && <p className="text-destructive">Tempo limite: talvez um laço infinito ou input() a mais.</p>}
              {!c.ok && c.status !== "unavailable" && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><div className="text-xs font-bold text-muted-foreground">Esperado</div><pre className="whitespace-pre-wrap rounded bg-muted p-2">{c.expected || "(vazio)"}</pre></div>
                  <div><div className="text-xs font-bold text-muted-foreground">Obtido</div><pre className="whitespace-pre-wrap rounded bg-muted p-2">{c.got || "(vazio)"}</pre></div>
                  {diffNote(c.expected, c.got) && <p className="sm:col-span-2">{diffNote(c.expected, c.got)}</p>}
                  {c.stderr && <pre className="whitespace-pre-wrap rounded bg-terminal p-2 text-terminal-error sm:col-span-2">{c.stderr}</pre>}
                  {c.stderr && explainError(c.stderr) && <p className="sm:col-span-2"><strong>Dica:</strong> {explainError(c.stderr)}</p>}
                </div>
              )}
            </details>
          ))}
          <p className="text-xs text-muted-foreground">A correção compara a saída (stdout) após normalizar quebras de linha (CRLF→LF), espaços no fim das linhas e linhas vazias finais. Não avalia estilo nem eficiência.</p>
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

function diffNote(exp: string, got: string) {
  const e = exp.split("\n"), g = got.split("\n");
  for (let i = 0; i < Math.max(e.length, g.length); i++) {
    if (e[i] !== g[i]) {
      if (g[i] === undefined) return `Faltou a linha ${i + 1}: "${e[i]}".`;
      if (e[i] === undefined) return `Linha extra ${i + 1}: "${g[i]}".`;
      if (e[i]!.toLowerCase() === g[i]!.toLowerCase()) return `Linha ${i + 1}: diferença só de maiúsculas/minúsculas.`;
      return `Primeira diferença na linha ${i + 1}: esperado "${e[i]}", obtido "${g[i]}".`;
    }
  }
  return "";
}