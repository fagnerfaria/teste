import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
async function fixture() {
  vi.resetModules();
  const store = await import("../lib/store");
  const old = { ...store.defaultData(), completedLessons: { programa: 123 } };
  const persisted = JSON.stringify(old);
  vi.stubGlobal("window", { addEventListener: vi.fn() });
  const storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = { getItem: () => persisted, setItem: () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); }, removeItem: () => { throw new DOMException("Storage blocked", "SecurityError"); } };
  vi.stubGlobal("localStorage", storage);
  store.getData();
  return { store, old, stored: () => persisted, storage };
}
describe("persistência transacional do progresso", () => {
  it("uma importação sem espaço preserva o progresso anterior e informa falha", async () => {
    const { store, old, stored } = await fixture();
    expect(() => store.replaceAll({ ...store.defaultData(), completedLessons: { novo: 456 } })).toThrow("não foi substituído");
    expect(store.getData()).toEqual(old);
    expect(JSON.parse(stored())).toEqual(old);
  });
  it("falha ao apagar preserva estado; digitação permanece disponível com aviso", async () => {
    const { store, old } = await fixture();
    expect(() => store.resetAll()).toThrow("Não foi possível apagar");
    expect(store.getData()).toEqual(old);
    expect(() => store.saveDraft("ex:teste", "print(42)")).not.toThrow();
    expect(store.getData().drafts["ex:teste"]).toBe("print(42)");
    expect(store.getPersistenceError()).toContain("apenas nesta aba");
  });
  it("apagamento remove a chave mesmo se não houver espaço para outra escrita", async () => {
    const { store, storage } = await fixture();
    const remove = vi.fn(); storage.removeItem = remove;
    store.resetAll();
    expect(remove).toHaveBeenCalledWith("codigolab:v1");
    expect(store.getData()).toEqual(store.defaultData());
    expect(store.getPersistenceError()).toBe("");
  });
});
