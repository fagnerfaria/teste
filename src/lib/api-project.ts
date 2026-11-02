import apiSource from "./api-lab.ts?raw";

/** Exportável e executável com Node 24, sem pacotes ou credenciais externos. */
export const API_BACKEND_FILES: Record<string, string> = {
  "api-lab.ts": apiSource,
  "server.ts": `import { createServer } from "node:http";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApiLab, API_LAB_ORIGIN } from "./api-lab.ts";
import type { LabStorage } from "./api-lab.ts";

export function makeServer(storage: LabStorage) {
  const api = createApiLab(storage);
  return createServer(async (req, res) => {
    try {
      let body = "";
      for await (const chunk of req) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 4096) { res.writeHead(413); res.end('{"erro":"Corpo muito grande"}'); return; }
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      const response = await api.fetch(new Request(new URL(req.url ?? "/", API_LAB_ORIGIN), { method: req.method ?? "GET", headers, ...(["GET", "HEAD"].includes(req.method ?? "GET") ? {} : { body }) }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch { res.writeHead(500); res.end('{"erro":"Falha interna"}'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = resolve("banco-didatico.json");
  const storage: LabStorage = {
    getItem: () => { try { return readFileSync(path, "utf8"); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; } },
    setItem: (_key, value) => { writeFileSync(path + ".tmp", value, { mode: 0o600 }); renameSync(path + ".tmp", path); },
  };
  const port = Number(process.env["PORT"] ?? 3000);
  makeServer(storage).listen(port, "127.0.0.1", () => console.log("API de treino: http://127.0.0.1:" + port));
}
`,
  "acceptance.test.ts": `import { test } from "node:test";
import assert from "node:assert/strict";
import { makeServer } from "./server.ts";

test("HTTP real: login, CRUD e validação", async () => {
  const data = new Map<string, string>();
  const server = makeServer({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const base = "http://127.0.0.1:" + address.port;
    assert.equal((await fetch(base + "/tarefas")).status, 401);
    const login = await fetch(base + "/auth/login", { method: "POST", body: JSON.stringify({ usuario: "aluno", senha: "codigolab" }) });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
    const created = await fetch(base + "/tarefas", { method: "POST", headers, body: JSON.stringify({ titulo: "Aprender HTTP" }) });
    assert.equal(created.status, 201);
    assert.deepEqual(await created.json(), { id: 1, titulo: "Aprender HTTP", concluida: false });
    assert.equal((await fetch(base + "/tarefas/1", { method: "PATCH", headers, body: JSON.stringify({ concluida: true }) })).status, 200);
    assert.equal((await fetch(base + "/tarefas", { method: "POST", headers, body: JSON.stringify({ titulo: "" }) })).status, 422);
    assert.equal((await fetch(base + "/tarefas/1", { method: "DELETE", headers })).status, 204);
    assert.equal((await fetch(base + "/tarefas/1", { headers })).status, 404);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
`,
  "package.json": JSON.stringify({ name: "codigolab-api-didatica", private: true, type: "module", scripts: { start: "node server.ts", test: "node --test acceptance.test.ts" }, engines: { node: ">=24" } }, null, 2),
  "README.md": `# API didática CódigoLab\n\nRequer Node.js 24 ou superior. Não possui dependências npm.\n\n1. Extraia todos os arquivos na mesma pasta.\n2. Execute: node --test acceptance.test.ts\n3. Execute: node server.ts\n4. Acesse http://127.0.0.1:3000/health\n\nRotas: POST /auth/login; GET /me; POST /auth/logout; GET e POST /tarefas; GET, PATCH, PUT e DELETE /tarefas/:id.\n\nLogin fictício: aluno / codigolab. Envie o token recebido em Authorization: Bearer <token>. Corpo JSON: {"titulo":"Estudar"}; atualização: {"concluida":true}.\n\nO banco local banco-didatico.json persiste tarefas e uma sessão por uma hora. O servidor só escuta 127.0.0.1. Use dados fictícios. As credenciais públicas e o token em arquivo são escolhas de demonstração, inadequadas para produção. Um serviço público exige identidade real, senhas derivadas com algoritmo adequado, TLS, controle de acesso, persistência concorrente e operações monitoradas.\n\nNo celular, use o laboratório /api do CódigoLab para executar os mesmos contratos sem instalar Node. Um navegador não abre a porta de rede deste servidor.\n\nConteúdo e implementação: CódigoLab, material didático autoral.\n`,
};

/** Arquivo TAR sem dependências; nomes fixos e conteúdo UTF-8. */
export function backendProjectArchive(): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  for (const [name, text] of Object.entries(API_BACKEND_FILES)) {
    const bytes = encoder.encode(text);
    const header = new Uint8Array(512);
    const put = (offset: number, size: number, value: string) => header.set(encoder.encode(value).slice(0, size), offset);
    put(0, 100, name); put(100, 8, "0000644\0"); put(108, 8, "0000000\0"); put(116, 8, "0000000\0");
    put(124, 12, bytes.length.toString(8).padStart(11, "0") + "\0"); put(136, 12, "00000000000\0");
    put(148, 8, "        "); put(156, 1, "0"); put(257, 6, "ustar\0"); put(263, 2, "00");
    const checksum = header.reduce((sum, value) => sum + value, 0);
    put(148, 8, checksum.toString(8).padStart(6, "0") + "\0 ");
    parts.push(header, bytes, new Uint8Array((512 - bytes.length % 512) % 512));
  }
  parts.push(new Uint8Array(1024));
  return new Blob(parts, { type: "application/x-tar" });
}
