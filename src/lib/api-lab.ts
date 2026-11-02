export const API_LAB_ORIGIN = "https://api.codigolab.local";
export type LabStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
export type LabTask = { id: number; titulo: string; concluida: boolean };
type Database = { version: 1; nextId: number; tasks: LabTask[]; session: { token: string; expires: number } | null };
const KEY = "codigolab-api-lab-v1";
const fresh = (): Database => ({ version: 1, nextId: 1, tasks: [], session: null });

function readDatabase(storage: LabStorage): Database {
  const text = storage.getItem(KEY);
  if (!text) return fresh();
  const data = JSON.parse(text) as Database;
  if (data.version !== 1 || !Number.isSafeInteger(data.nextId) || data.nextId < 1 || !Array.isArray(data.tasks) || data.tasks.length > 200 ||
    !data.tasks.every(task => Number.isSafeInteger(task.id) && task.id > 0 && typeof task.titulo === "string" && task.titulo.length <= 120 && typeof task.concluida === "boolean") ||
    (data.session !== null && (typeof data.session?.token !== "string" || typeof data.session?.expires !== "number"))) {
    throw new Error("Banco de treino inválido. Restaure o laboratório para continuar.");
  }
  return data;
}

/** Servidor didático Request → Response. Nenhuma requisição sai do navegador. */
export function createApiLab(storage: LabStorage, options: { now?: () => number; token?: () => string } = {}) {
  const now = options.now ?? Date.now;
  const token = options.token ?? (() => crypto.randomUUID());
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
  const error = (erro: string, status: number) => json({ erro }, status);
  const save = (db: Database) => storage.setItem(KEY, JSON.stringify(db));

  return {
    reset() { save(fresh()); },
    async fetch(request: Request): Promise<Response> {
      try {
        const url = new URL(request.url);
        if (url.origin !== API_LAB_ORIGIN) return error("Use somente a origem fictícia do laboratório.", 400);
        const path = url.pathname.replace(/\/$/, "") || "/";
        const method = request.method;
        if (path === "/health" && method === "GET") return json({ status: "ok", ambiente: "local-didatico" });
        let body: Record<string, unknown> = {};
        if (["POST", "PUT", "PATCH"].includes(method)) {
          const text = await request.text();
          if (text.length > 4096) return error("Corpo maior que 4.096 caracteres.", 413);
          try { body = JSON.parse(text || (path === "/auth/logout" ? "{}" : "")) as Record<string, unknown>; } catch { return error("Envie um objeto JSON válido.", 400); }
          if (!body || typeof body !== "object" || Array.isArray(body)) return error("Envie um objeto JSON válido.", 400);
        }
        const db = readDatabase(storage);
        if (path === "/auth/login") {
          if (method !== "POST") return json({ erro: "Método não permitido." }, 405, { Allow: "POST" });
          if (body["usuario"] !== "aluno" || body["senha"] !== "codigolab") return error("Credenciais fictícias incorretas.", 401);
          db.session = { token: token(), expires: now() + 3_600_000 };
          save(db);
          return json({ token: db.session.token, tipo: "Bearer", expiraEm: db.session.expires, aviso: "Token didático local; não use como autenticação de produção." });
        }
        if (path !== "/tarefas" && !/^\/tarefas\/\d+$/.test(path) && !["/me", "/auth/logout"].includes(path)) return error("Rota não encontrada.", 404);
        if (!db.session || db.session.expires <= now() || request.headers.get("Authorization") !== "Bearer " + db.session.token) return error("Autenticação necessária. Faça login e envie Authorization: Bearer <token>.", 401);
        if (path === "/me" && method === "GET") return json({ usuario: "aluno", papel: "estudante" });
        if (path === "/auth/logout" && method === "POST") { db.session = null; save(db); return new Response(null, { status: 204 }); }
        if (path === "/tarefas") {
          if (method === "GET") {
            const filter = url.searchParams.get("concluida");
            if (filter !== null && !["true", "false"].includes(filter)) return error("Filtro concluida deve ser true ou false.", 400);
            return json(db.tasks.filter(task => filter === null || task.concluida === (filter === "true")));
          }
          if (method === "POST") {
            if (typeof body["titulo"] !== "string" || !body["titulo"].trim() || body["titulo"].trim().length > 120) return error("titulo precisa conter entre 1 e 120 caracteres.", 422);
            if (db.tasks.length >= 200) return error("Limite de 200 tarefas de treino atingido.", 409);
            const task = { id: db.nextId++, titulo: body["titulo"].trim(), concluida: false };
            db.tasks.push(task); save(db);
            return json(task, 201, { Location: "/tarefas/" + task.id });
          }
          return json({ erro: "Método não permitido." }, 405, { Allow: "GET, POST" });
        }
        if (path.startsWith("/tarefas/")) {
          const id = Number(path.split("/")[2]);
          const task = db.tasks.find(item => item.id === id);
          if (!task) return error("Tarefa não encontrada.", 404);
          if (method === "GET") return json(task);
          if (method === "DELETE") { db.tasks = db.tasks.filter(item => item.id !== id); save(db); return new Response(null, { status: 204 }); }
          if (method === "PATCH" || method === "PUT") {
            if (Object.keys(body).some(key => !["titulo", "concluida"].includes(key)) || Object.keys(body).length === 0) return error("Atualize titulo e/ou concluida.", 422);
            if (method === "PUT" && (!("titulo" in body) || !("concluida" in body))) return error("PUT exige titulo e concluida.", 422);
            if ("titulo" in body && (typeof body["titulo"] !== "string" || !body["titulo"].trim() || body["titulo"].trim().length > 120)) return error("titulo inválido.", 422);
            if ("concluida" in body && typeof body["concluida"] !== "boolean") return error("concluida precisa ser booleano.", 422);
            if (typeof body["titulo"] === "string") task.titulo = body["titulo"].trim();
            if (typeof body["concluida"] === "boolean") task.concluida = body["concluida"];
            save(db); return json(task);
          }
          return json({ erro: "Método não permitido." }, 405, { Allow: "GET, PATCH, PUT, DELETE" });
        }
        return json({ erro: "Método não permitido." }, 405, { Allow: path === "/me" ? "GET" : "POST" });
      } catch {
        return error("Banco de treino indisponível. Verifique o armazenamento do navegador ou restaure o laboratório.", 503);
      }
    },
  };
}
