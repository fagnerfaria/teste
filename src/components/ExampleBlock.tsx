import { useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { Terminal } from "./Terminal";
import { useRunner, footerFor } from "@/hooks/use-runner";
import { useData } from "@/lib/store";

export function ExampleBlock({ title, code: initial }: { title: string; code: string }) {
  const [code, setCode] = useState(initial);
  const r = useRunner();
  const { timeoutMs } = useData();
  return (
    <div className="card-surface space-y-2 p-3">
      <h4 className="font-bold">{title}</h4>
      <CodeEditor value={code} onChange={setCode} lang="python" minHeight={90} label={`Exemplo: ${title}`} />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={r.running} onClick={() => r.run("python", code, { timeoutMs })}>{r.running ? "Executando…" : "▶ Executar"}</button>
        {r.running && <button className="btn btn-danger" onClick={r.stop}>■ Parar</button>}
        <button className="btn btn-ghost" onClick={() => setCode(initial)}>Restaurar</button>
      </div>
      {(r.chunks.length > 0 || r.running) && <Terminal chunks={r.running && !r.chunks.length ? [{ stream: "info", text: "Executando… (o 1º uso baixa o Python)\n" }] : r.chunks} footer={footerFor(r.last)} />}
    </div>
  );
}