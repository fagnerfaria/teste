import { useState } from "react";
import { SIMULATIONS } from "@/lib/content/simulations";

export function Simulator({ onLoadCode }: { onLoadCode?: (code: string) => void }) {
  const [simId, setSimId] = useState(SIMULATIONS[0].id);
  const [step, setStep] = useState(0);
  const sim = SIMULATIONS.find((s) => s.id === simId)!;
  const s = sim.steps[step];
  const prev = step > 0 ? sim.steps[step - 1].vars : {};
  return (
    <div className="space-y-3">
      <p className="rounded-md bg-muted p-2 text-sm text-muted-foreground">
        Simulação didática com traços preparados pelo CódigoLab — <strong>não executa código</strong> e não é um depurador genérico.
        Simulação guiada disponível apenas para exemplos selecionados.
      </p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Exemplos de simulação">
        {SIMULATIONS.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === simId}
            className={`btn ${x.id === simId ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setSimId(x.id); setStep(0); }}>{x.title}</button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <pre className="overflow-auto rounded-lg border bg-card p-2 text-sm" aria-label="Código da simulação">
          {sim.code.split("\n").map((l, i) => (
            <div key={i} className={`flex gap-3 rounded px-1 ${s.line === i + 1 ? "bg-accent text-accent-foreground" : ""}`}>
              <span className="w-5 select-none text-right opacity-50">{i + 1}</span>
              <span className="whitespace-pre">{l}</span>
              {s.line === i + 1 && <span className="ml-auto" aria-label="linha atual">◀</span>}
            </div>
          ))}
        </pre>
        <div className="space-y-2">
          <div className="card-surface p-3">
            <h4 className="mb-1 text-xs font-bold uppercase text-muted-foreground">Variáveis</h4>
            {Object.keys(s.vars).length === 0 && <p className="text-sm text-muted-foreground">nenhuma ainda</p>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 font-mono text-sm">
              {Object.entries(s.vars).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>{k}</dt>
                  <dd className={prev[k] !== v ? "font-bold text-primary" : ""}>{v}{prev[k] !== undefined && prev[k] !== v && <span className="ml-2 text-xs text-muted-foreground">(era {prev[k]})</span>}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-lg bg-terminal p-3 font-mono text-sm text-terminal-foreground min-h-12">
            {s.output.length ? s.output.map((o, i) => <div key={i}>{o}</div>) : <span className="opacity-60">(sem saída ainda)</span>}
          </div>
        </div>
      </div>
      <p className="text-sm" aria-live="polite"><strong>Passo {step + 1}/{sim.steps.length}, linha {s.line}:</strong> {s.note}</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Anterior</button>
        <button className="btn btn-primary" disabled={step === sim.steps.length - 1} onClick={() => setStep(step + 1)}>Próximo passo →</button>
        <button className="btn btn-ghost" onClick={() => setStep(0)}>Recomeçar</button>
        {onLoadCode && <button className="btn btn-ghost" onClick={() => onLoadCode(sim.code)}>Levar para o editor e executar de verdade</button>}
      </div>
    </div>
  );
}