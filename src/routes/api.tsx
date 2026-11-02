import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { createApiLab, API_LAB_ORIGIN } from "@/lib/api-lab";
import { backendProjectArchive } from "@/lib/api-project";

export const Route = createFileRoute("/api")({ head: () => ({ meta: [{ title: "Laboratório de APIs — CódigoLab" }] }), component: ApiLab });
const EXAMPLES = [
  { title: "1 · Verificar saúde", method: "GET", path: "/health", body: "" },
  { title: "2 · Fazer login fictício", method: "POST", path: "/auth/login", body: '{\n  "usuario": "aluno",\n  "senha": "codigolab"\n}' },
  { title: "3 · Criar tarefa", method: "POST", path: "/tarefas", body: '{\n  "titulo": "Aprender contratos HTTP"\n}' },
  { title: "4 · Listar tarefas", method: "GET", path: "/tarefas", body: "" },
  { title: "5 · Concluir tarefa 1", method: "PATCH", path: "/tarefas/1", body: '{\n  "concluida": true\n}' },
  { title: "6 · Filtrar concluídas", method: "GET", path: "/tarefas?concluida=true", body: "" },
  { title: "7 · Excluir tarefa 1", method: "DELETE", path: "/tarefas/1", body: "" },
  { title: "8 · Testar validação", method: "POST", path: "/tarefas", body: '{"titulo":""}' },
  { title: "9 · Encerrar sessão", method: "POST", path: "/auth/logout", body: "" },
] as const;
type HttpResult = { status: number; body: string; headers: string; duration: number };

function ApiLab() {
  const api = useMemo(() => createApiLab({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) }), []);
  const [method, setMethod] = useState<string>("GET");
  const [path, setPath] = useState("/health");
  const [body, setBody] = useState("");
  const [token, setToken] = useState("");
  const [useAuth, setUseAuth] = useState(true);
  const [result, setResult] = useState<HttpResult | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [checks, setChecks] = useState<Array<{ title: string; passed: boolean }>>([]);
  const choose = (index: number) => {
    const example = EXAMPLES[index];
    if (!example) return;
    setMethod(example.method); setPath(example.path); setBody(example.body); setResult(null);
  };
  const send = async () => {
    setRunning(true); setMessage("");
    try {
      if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Informe um caminho como /tarefas.");
      const headers = new Headers({ "Content-Type": "application/json" });
      if (useAuth && token.trim()) headers.set("Authorization", "Bearer " + token.trim());
      const start = performance.now();
      const response = await api.fetch(new Request(API_LAB_ORIGIN + path, { method, headers, ...(["GET", "HEAD"].includes(method) ? {} : { body }) }));
      const text = await response.text();
      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch { /* 204 has no body. */ }
      setResult({ status: response.status, body: formatted || "(sem corpo)", headers: [...response.headers].map(([key, value]) => key + ": " + value).join("\n"), duration: Math.round(performance.now() - start) });
      if (path === "/auth/login" && response.ok) { const data = JSON.parse(text); setToken(String(data.token)); }
      if (path === "/auth/logout" && response.ok) setToken("");
      setHistory(items => [`${method} ${path} → ${response.status}`, ...items].slice(0, 10));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível preparar a requisição."); }
    finally { setRunning(false); }
  };
  const verify = async () => {
    setRunning(true); setChecks([]);
    try {
      const data = new Map<string, string>();
      const isolated = createApiLab({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } });
      let auth = "";
      const rows: Array<{ title: string; passed: boolean }> = [];
      const run = async (title: string, method: string, path: string, expected: number, body?: object) => {
        const response = await isolated.fetch(new Request(API_LAB_ORIGIN + path, { method, headers: { Authorization: auth, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }));
        rows.push({ title, passed: response.status === expected });
        if (path === "/auth/login" && response.ok) auth = "Bearer " + (await response.json()).token;
      };
      await run("Recurso protegido sem token: 401", "GET", "/tarefas", 401);
      await run("Login fictício: 200", "POST", "/auth/login", 200, { usuario: "aluno", senha: "codigolab" });
      await run("Criar tarefa: 201", "POST", "/tarefas", 201, { titulo: "Teste de aceitação" });
      await run("Atualizar tarefa: 200", "PATCH", "/tarefas/1", 200, { concluida: true });
      await run("Rejeitar título vazio: 422", "POST", "/tarefas", 422, { titulo: "" });
      await run("Excluir tarefa: 204", "DELETE", "/tarefas/1", 204);
      await run("Consultar removida: 404", "GET", "/tarefas/1", 404);
      await run("Logout sem corpo: 204", "POST", "/auth/logout", 204);
      setChecks(rows);
    } catch (error) { setMessage(String(error)); } finally { setRunning(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(backendProjectArchive());
    const link = document.createElement("a"); link.href = url; link.download = "codigolab-backend-node24.tar"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="space-y-6">
    <header><p className="text-sm font-bold text-primary">Desenvolvimento de aplicações</p><h1 className="text-3xl font-extrabold">Construa e teste uma API</h1><p className="mt-2 text-muted-foreground">Pratique requisições, contratos HTTP, autenticação de treino, validação e um CRUD com dados persistentes.</p></header>
    <section className="card-surface space-y-3 p-4"><h2 className="text-xl font-bold">Como este ambiente funciona</h2><p>O mesmo roteador recebe objetos <code>Request</code> e produz <code>Response</code>. Aqui, ele executa no navegador e grava tarefas no armazenamento local. A origem <code>{API_LAB_ORIGIN}</code> é fictícia: nenhuma requisição é enviada pela rede.</p><p className="text-sm text-muted-foreground">Para executar um servidor HTTP de verdade, baixe o projeto Node 24 com roteador, banco em arquivo e teste de aceitação. O projeto não depende de pacotes npm. A execução do servidor exige um ambiente com Node; os exercícios desta página funcionam no celular.</p><button className="btn btn-ghost" onClick={download}>Baixar backend completo (.tar)</button><p className="text-xs text-muted-foreground">Credenciais de demonstração: aluno / codigolab. Não use dados pessoais. Esta autenticação é pública e didática; não serve como proteção de produção.</p></section>
    <section className="card-surface space-y-4 p-4"><h2 className="text-xl font-bold">Cliente HTTP interativo</h2><label className="block text-sm font-semibold">Sequência de treino<select aria-label="Exemplo de API" defaultValue="0" onChange={event => choose(Number(event.target.value))} className="mt-1 w-full rounded-lg border bg-background p-3">{EXAMPLES.map((example, index) => <option key={example.title} value={index}>{example.title}</option>)}</select></label><div className="flex gap-2"><label className="text-sm font-semibold">Método<select aria-label="Método HTTP" value={method} onChange={event => setMethod(event.target.value)} className="mt-1 block rounded-lg border bg-background p-3">{["GET", "POST", "PATCH", "PUT", "DELETE"].map(item => <option key={item}>{item}</option>)}</select></label><label className="min-w-0 flex-1 text-sm font-semibold">Caminho<input aria-label="Caminho HTTP" value={path} maxLength={500} onChange={event => setPath(event.target.value)} className="mt-1 block w-full rounded-lg border bg-background p-3 font-mono" /></label></div><label className="block text-sm font-semibold">Corpo JSON<textarea aria-label="Corpo JSON" value={body} maxLength={4096} onChange={event => setBody(event.target.value)} rows={6} spellCheck={false} className="mt-1 w-full rounded-lg border bg-background p-3 font-mono text-sm" disabled={method === "GET"} /></label><label className="block text-sm"><input type="checkbox" checked={useAuth} onChange={event => setUseAuth(event.target.checked)} /> Enviar Authorization com token obtido no login</label><p className="text-xs text-muted-foreground" role="status">{token ? "Sessão didática disponível. O token expira em uma hora e é usado apenas neste laboratório." : "Sem sessão. Escolha o exemplo de login e envie a requisição."}</p><button className="btn btn-primary" disabled={running} onClick={() => void send()}>{running ? "Executando…" : "Enviar requisição"}</button>{message && <p role="alert" className="text-destructive">{message}</p>}</section>
    {result && <section className="card-surface space-y-3 p-4" aria-live="polite"><h2 className="text-xl font-bold">Resposta HTTP {result.status}</h2><p className="text-xs text-muted-foreground">Execução local: {result.duration} ms</p><pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs">{result.headers}</pre><pre aria-label="Corpo da resposta" className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm">{result.body}</pre></section>}
    <section className="card-surface space-y-3 p-4"><h2 className="text-xl font-bold">Validação automatizada</h2><p className="text-sm">A bateria cria um banco temporário separado e executa os contratos de autenticação e CRUD. As tarefas do seu laboratório permanecem disponíveis.</p><button className="btn btn-ghost" disabled={running} onClick={() => void verify()}>Executar 8 testes de aceitação</button>{checks.length > 0 && <ul aria-live="polite" className="space-y-1 text-sm">{checks.map(check => <li key={check.title} className={check.passed ? "text-success" : "text-destructive"}>{check.passed ? "✓" : "✗"} {check.title}</li>)}</ul>}</section>
    {history.length > 0 && <section className="card-surface p-4"><h2 className="font-bold">Últimas requisições desta sessão</h2><ol className="mt-2 space-y-1 font-mono text-xs">{history.map((item, index) => <li key={index}>{item}</li>)}</ol></section>}
    <section className="card-surface space-y-2 p-4"><h2 className="font-bold">Desafio: descubra o contrato pelos resultados</h2><p className="text-sm">Crie duas tarefas. Conclua uma. Consulte <code>/tarefas?concluida=false</code> e confira a filtragem. Remova a tarefa concluída e consulte seu id: a resposta esperada é 404. Desative o envio do token para observar 401. Compare PATCH parcial e PUT, que exige os dois campos.</p><button className="btn btn-ghost" onClick={() => { try { api.reset(); setToken(""); setResult(null); setMessage("Banco didático restaurado."); } catch { setMessage("Armazenamento indisponível."); } }}>Restaurar banco fictício</button></section>
    <Link to="/agentes" className="font-bold text-primary underline">Continuar: ferramentas, RAG e agentes →</Link>
  </div>;
}
