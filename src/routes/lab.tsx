import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { Terminal } from "@/components/Terminal";
import { Simulator } from "@/components/Simulator";
import { PyStatusBadge } from "@/components/PyStatusBadge";
import { useRunner, footerFor } from "@/hooks/use-runner";
import { resetPython } from "@/lib/runtime";
import { getData, saveDraft, update, useData } from "@/lib/store";

type LabLang = "python" | "javascript" | "html";
const EXAMPLES: Record<LabLang, { title: string; code: string }[]> = {
  python: [
    { title: "Olá mundo", code: 'print("Olá, mundo!")' },
    { title: "Variáveis", code: "preco = 12.5\nquantidade = 3\ntotal = preco * quantidade\nprint('Total:', total)" },
    { title: "Comparação", code: "idade = 17\nif idade >= 18:\n    print('pode votar e dirigir')\nelif idade >= 16:\n    print('pode votar')\nelse:\n    print('ainda não vota')" },
    { title: "Repetição", code: "for i in range(1, 6):\n    print(i, 'x 7 =', i * 7)" },
    { title: "Função", code: "def dobro(n):\n    return n * 2\n\nfor x in [1, 5, 10]:\n    print(x, '->', dobro(x))" },
    { title: "input()", code: "nome = input('Seu nome: ')\nprint('Prazer,', nome)" },
    { title: "Erro proposital", code: "print('antes do erro')\nprint(10 / 0)" },
    { title: "Laço infinito", code: "# Clique em Parar ou espere o tempo limite\nwhile True:\n    pass" },
  ],
  javascript: [
    { title: "console.log", code: 'console.log("Olá!");' },
    { title: "Laço e array", code: "const nums = [1, 2, 3];\nfor (const n of nums) console.log(n * 10);\nconsole.log({ total: nums.length });" },
    { title: "Timer", code: "console.log('agora');\nsetTimeout(() => console.log('1 segundo depois'), 1000);" },
    { title: "Erro", code: "const x = 1;\nconsole.log(y);" },
    { title: "Laço infinito", code: "while (true) {}" },
  ],
  html: [
    { title: "Página com botão", code: '<h1>Minha página</h1>\n<button id="b">Clique</button>\n<p id="t"></p>\n<style>\n  body { font-family: sans-serif; padding: 1rem; }\n  h1 { color: teal; }\n</style>\n<script>\n  let n = 0;\n  document.getElementById("b").onclick = () => {\n    n++;\n    document.getElementById("t").textContent = "Cliques: " + n;\n  };\n</script>' },
  ],
};

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Laboratório — CódigoLab" },
      { name: "description", content: "Execute Python (Pyodide) e JavaScript de verdade no navegador, com simulação passo a passo." },
      { property: "og:title", content: "Laboratório de código — CódigoLab" },
      { property: "og:description", content: "Python e JavaScript executados de verdade no seu navegador." },
    ],
  }),
  component: Lab,
});

function Lab() {
  const data = useData();
  const [lang, setLang] = useState<LabLang>("python");
  const [exIdx, setExIdx] = useState(0);
  const [code, setCode] = useState(EXAMPLES.python[0]!.code);
  const [stdin, setStdin] = useState("");
  const [mode, setMode] = useState<"run" | "sim">("run");
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const r = useRunner();

  useEffect(() => {
    const d = getData().drafts[`lab:${lang}`];
    setCode(d ?? EXAMPLES[lang][0]!.code); setExIdx(0); r.setChunks([]);
    if (lang === "python") r.preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const change = (v: string) => { setCode(v); saveDraft(`lab:${lang}`, v); };
  const loadExample = (i: number) => { setExIdx(i); change(EXAMPLES[lang][i]!.code); };
  const execute = () => {
    if (lang === "html") { setPreview(code); return; }
    r.run(lang, code, { stdin, timeoutMs: data.timeoutMs });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-extrabold">Laboratório</h1>
          <p className="text-sm text-muted-foreground">O código roda de verdade no seu navegador, isolado em um Web Worker.</p>
        </div>
        <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Modo">
          <button role="tab" aria-selected={mode === "run"} className={`btn ${mode === "run" ? "btn-primary" : ""}`} onClick={() => setMode("run")}>▶ Executar de verdade</button>
          <button role="tab" aria-selected={mode === "sim"} className={`btn ${mode === "sim" ? "btn-accent" : ""}`} onClick={() => setMode("sim")}>👣 Simular passo a passo</button>
        </div>
      </div>

      {mode === "sim" ? (
        <Simulator onLoadCode={(c) => { setMode("run"); if (lang !== "python") setLang("python"); setTimeout(() => change(c), 0); }} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold" htmlFor="lang">Linguagem</label>
            <select id="lang" value={lang} onChange={(e) => setLang(e.target.value as LabLang)} className="rounded-md border bg-card px-2 py-2 text-sm">
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript</option>
              <option value="html">HTML/CSS/JS (visualização)</option>
            </select>
            <label className="text-sm font-semibold" htmlFor="ex">Exemplo</label>
            <select id="ex" value={exIdx} onChange={(e) => loadExample(Number(e.target.value))} className="rounded-md border bg-card px-2 py-2 text-sm">
              {EXAMPLES[lang].map((e, i) => <option key={i} value={i}>{e.title}</option>)}
            </select>
            {lang === "python" && <PyStatusBadge />}
          </div>

          {lang === "javascript" && <p className="rounded-md bg-muted p-2 text-xs">Sandbox educacional: o JS roda num Worker isolado, sem acesso à página. Não cole código de terceiros sem entender o que ele faz.</p>}

          <CodeEditor key={lang} value={code} onChange={change} lang={lang} minHeight={240} />

          {lang === "python" && (
            <div>
              <label htmlFor="stdin" className="text-sm font-semibold">Entrada (stdin) para input() — uma resposta por linha</label>
              <textarea id="stdin" value={stdin} onChange={(e) => setStdin(e.target.value)} rows={2} placeholder="Ex.: Ana"
                className="mt-1 block w-full rounded-md border bg-card p-2 font-mono text-sm" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={execute} disabled={r.running}>{r.running ? "Executando…" : lang === "html" ? "↻ Atualizar visualização" : "▶ Executar"}</button>
            {lang !== "html" && <button className="btn btn-danger" onClick={r.stop} disabled={!r.running}>■ Parar</button>}
            {lang !== "html" && <button className="btn btn-ghost" onClick={() => r.setChunks([])}>Limpar saída</button>}
            {lang === "python" && <button className="btn btn-ghost" onClick={() => { resetPython(); r.setChunks([{ stream: "info", text: "Ambiente Python reiniciado.\n" }]); r.preload(); }}>Reiniciar Python</button>}
            <button className="btn btn-ghost" onClick={() => change(EXAMPLES[lang][exIdx]!.code)}>Restaurar exemplo</button>
            <button className="btn btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sem permissão */ } }}>{copied ? "Copiado!" : "Copiar código"}</button>
          </div>

          {lang === "html" ? (
            <div className="space-y-1">
              <iframe title="Visualização HTML" sandbox="allow-scripts" srcDoc={preview} className="h-72 w-full rounded-lg border bg-card" />
              <p className="text-xs text-muted-foreground">{preview ? "Iframe isolado (sandbox sem allow-same-origin)." : "Clique em Atualizar visualização."}</p>
            </div>
          ) : (
            <Terminal chunks={r.running && r.chunks.length === 0 ? [{ stream: "info", text: lang === "python" ? "Preparando e executando…\n" : "Executando…\n" }] : r.chunks} footer={footerFor(r.last)} />
          )}

          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="to">Tempo limite</label>
            <select id="to" value={data.timeoutMs} onChange={(e) => update((d) => ({ ...d, timeoutMs: Number(e.target.value) }))} className="rounded-md border bg-card px-2 py-1">
              {[2000, 5000, 10000, 30000].map((v) => <option key={v} value={v}>{v / 1000} s</option>)}
            </select>
            <span className="text-muted-foreground">(não conta o primeiro download do Python)</span>
          </div>
        </>
      )}
    </div>
  );
}