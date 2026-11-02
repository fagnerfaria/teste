import { describe, expect, it } from "vitest";
import { createApiLab, API_LAB_ORIGIN } from "../lib/api-lab";

function storage() {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); } };
}

describe("API de treino com contratos HTTP", () => {
  it("autentica, cria uma tarefa, persiste e permite sua atualização e exclusão", async () => {
    const db = storage();
    const api = createApiLab(db, { now: () => 1000, token: () => "sessao-de-teste" });
    expect((await api.fetch(new Request(API_LAB_ORIGIN + "/tarefas"))).status).toBe(401);
    const login = await api.fetch(new Request(API_LAB_ORIGIN + "/auth/login", { method: "POST", body: JSON.stringify({ usuario: "aluno", senha: "codigolab" }) }));
    expect(login.status).toBe(200);
    expect((await login.json()).token).toBe("sessao-de-teste");
    const headers = { Authorization: "Bearer sessao-de-teste", "Content-Type": "application/json" };
    const created = await api.fetch(new Request(API_LAB_ORIGIN + "/tarefas", { method: "POST", headers, body: JSON.stringify({ titulo: "Estudar HTTP" }) }));
    expect(created.status).toBe(201);
    const task = await created.json();
    expect(task).toEqual({ id: 1, titulo: "Estudar HTTP", concluida: false });
    const reloaded = createApiLab(db, { now: () => 1001 });
    const tasks = await (await reloaded.fetch(new Request(API_LAB_ORIGIN + "/tarefas", { headers }))).json();
    expect(tasks).toEqual([task]);
    const updated = await reloaded.fetch(new Request(API_LAB_ORIGIN + "/tarefas/1", { method: "PATCH", headers, body: JSON.stringify({ concluida: true }) }));
    expect((await updated.json()).concluida).toBe(true);
    expect((await reloaded.fetch(new Request(API_LAB_ORIGIN + "/tarefas?concluida=false", { headers }))).status).toBe(200);
    expect(await (await reloaded.fetch(new Request(API_LAB_ORIGIN + "/tarefas?concluida=false", { headers }))).json()).toEqual([]);
    expect((await reloaded.fetch(new Request(API_LAB_ORIGIN + "/tarefas/1", { method: "DELETE", headers }))).status).toBe(204);
    expect((await reloaded.fetch(new Request(API_LAB_ORIGIN + "/tarefas/1", { headers }))).status).toBe(404);
  });
  it("recusa JSON inválido e sessões expiradas sem apagar dados e efetua logout sem corpo", async () => {
    let clock = 100;
    const api = createApiLab(storage(), { now: () => clock, token: () => "teste" });
    const req = (path: string, method = "GET", body?: string) => new Request(API_LAB_ORIGIN + path, { method, headers: { Authorization: "Bearer teste" }, ...(body === undefined ? {} : { body }) });
    expect((await api.fetch(req("/auth/login", "POST", '{"usuario":"aluno","senha":"codigolab"}'))).status).toBe(200);
    expect((await api.fetch(req("/tarefas", "POST", "{"))).status).toBe(400);
    expect((await api.fetch(req("/tarefas", "POST", '{"titulo":""}'))).status).toBe(422);
    expect((await api.fetch(req("/auth/logout", "POST"))).status).toBe(204);
    expect((await api.fetch(req("/tarefas"))).status).toBe(401);
    await api.fetch(req("/auth/login", "POST", '{"usuario":"aluno","senha":"codigolab"}'));
    clock += 3_600_001;
    expect((await api.fetch(req("/tarefas"))).status).toBe(401);
  });
  it("preserva gravações concorrentes e responde com erro ao armazenamento bloqueado", async () => {
    const db = storage();
    const api = createApiLab(db, { token: () => "teste" });
    const req = (path: string, body: unknown) => new Request(API_LAB_ORIGIN + path, { method: "POST", headers: { Authorization: "Bearer teste" }, body: JSON.stringify(body) });
    await api.fetch(req("/auth/login", { usuario: "aluno", senha: "codigolab" }));
    const responses = await Promise.all([api.fetch(req("/tarefas", { titulo: "A" })), api.fetch(req("/tarefas", { titulo: "B" }))]);
    expect(responses.map(response => response.status)).toEqual([201, 201]);
    const list = await api.fetch(new Request(API_LAB_ORIGIN + "/tarefas", { headers: { Authorization: "Bearer teste" } }));
    expect((await list.json()).map((item: { id: number }) => item.id)).toEqual([1, 2]);
    expect((await api.fetch(new Request("https://example.com/tarefas"))).status).toBe(400);
    const unavailable = createApiLab({ getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } });
    expect((await unavailable.fetch(new Request(API_LAB_ORIGIN + "/tarefas"))).status).toBe(503);
  });
});
