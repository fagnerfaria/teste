import { describe, expect, it } from "vitest";
import { createSyncCode, encryptProgress, decryptProgress, deleteRemoteProgress, pullProgress, pushProgress, SyncConflictError } from "../lib/progress-sync";
import { defaultData } from "../lib/store";
describe("sincronização privada", () => {
  it("cifra e recupera o progresso sem expor o rascunho no servidor", async () => {
    const code = createSyncCode(), progress = { ...defaultData(), drafts: { a: "rascunho confidencial de teste" } };
    const encrypted = await encryptProgress(progress, code);
    expect(encrypted).not.toContain("rascunho confidencial");
    expect(await decryptProgress(encrypted, code)).toEqual(progress);
    await expect(decryptProgress(encrypted, createSyncCode())).rejects.toThrow();
  });
  it("envia o token somente no cabeçalho e não repete escrita em conflito", async () => {
    const code = createSyncCode(); let calls = 0;
    const request: typeof fetch = async (url, options) => {
      calls++; expect(url).toBe("/api/progress");
      const headers = options?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe(`Bearer ${code.split(".")[0]}`);
      expect(JSON.stringify(options)).not.toContain(code.split(".")[1]);
      return new Response("{}", { status: 409 });
    };
    await expect(pushProgress(code, defaultData(), 3, request)).rejects.toBeInstanceOf(SyncConflictError);
    expect(calls).toBe(1);
  });
  it("código novo começa na revisão zero e resposta remota inválida não altera dados", async () => {
    expect(await pullProgress(createSyncCode(), async () => new Response("", { status: 404 }))).toEqual({ revision: 0, data: null });
    await expect(pullProgress(createSyncCode(), async () => new Response(JSON.stringify({ revision: -1, payload: "x" })))).rejects.toThrow("inválida");
    await expect(pushProgress("senha-curta", defaultData(), 0, async () => new Response("{}"))).rejects.toThrow("inválido");
  });
  it("preserva a revisão de exclusão para impedir sobrescrita por clientes antigos", async () => {
    const code = createSyncCode();
    expect(await pullProgress(code, async () => new Response(JSON.stringify({ revision: 4, payload: null })))).toEqual({ revision: 4, data: null });
    expect(await deleteRemoteProgress(code, 3, async () => new Response(JSON.stringify({ revision: 4 })))).toBe(4);
    await expect(deleteRemoteProgress(code, 3, async () => new Response("{}", { status: 409 }))).rejects.toBeInstanceOf(SyncConflictError);
    await expect(deleteRemoteProgress(code, 4, async () => new Response(JSON.stringify({ revision: 0 })))).rejects.toThrow();
  });
});
