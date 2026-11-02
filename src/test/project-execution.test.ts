import { describe, expect, it, vi } from "vitest";
import { createWorkspace, prepareWorkspaceRun, prepareWorkspaceTests, upsertWorkspaceFile } from "../lib/workspace";

describe("Execução integrada de projetos", () => {
  it("resolve imports JavaScript entre arquivos e executa seu resultado", async () => {
    let p = createWorkspace("javascript");
    p = upsertWorkspaceFile(p, "main.js", 'import { dobro } from "./src/math.js"; console.log(dobro(9));');
    p = upsertWorkspaceFile(p, "src/math.js", "export const dobro = n => n * 2;");
    const run = await prepareWorkspaceRun(p);
    const messages: unknown[] = [];
    new Function("console", run.code)({log: (...args: unknown[]) => messages.push(args)});
    expect(messages).toEqual([[18]]);
    expect(run.module).toBe(true);
  });
  it("prepara arquivos e dependências Python explícitas sem perder o arquivo de entrada", async () => {
    let p = createWorkspace("python");
    p = upsertWorkspaceFile(p, "main.py", 'from contas import dobro\nprint(dobro(9))');
    p = upsertWorkspaceFile(p, "contas.py", "def dobro(n): return n * 2");
    p = upsertWorkspaceFile(p, "requirements.txt", "# pacotes do Pyodide\nnumpy\npandas\n");
    const run = await prepareWorkspaceRun(p);
    expect(run.project?.files["contas.py"]).toBe("def dobro(n): return n * 2");
    expect(run.project?.entry).toBe("main.py");
    expect(run.project?.packages).toEqual(["numpy", "pandas"]);
  });
  it("resolve dependências npm declaradas com versão exata e bloqueia as não declaradas", async () => {
    let p = createWorkspace("javascript");
    p = upsertWorkspaceFile(p, "main.js", 'import { dobro } from "math-example"; console.log(dobro(5));');
    await expect(prepareWorkspaceRun(p)).rejects.toThrow(/declarada/);
    p = upsertWorkspaceFile(p, "package.json", JSON.stringify({dependencies:{"math-example":"1.2.3"}}));
    const fetcher = vi.fn(async () => new Response("export const dobro = n => 2*n;"));
    vi.stubGlobal("fetch", fetcher);
    try {
      const run = await prepareWorkspaceRun(p);
      const messages: unknown[]=[];
      new Function("console",run.code)({log:(...args:unknown[])=>messages.push(args)});
      expect(messages).toEqual([[10]]);
      expect(fetcher.mock.calls.length).toBe(1);
    } finally { vi.unstubAllGlobals(); }
  });
  it("executa os testes JavaScript do projeto e propaga uma asserção com falha", async () => {
    let p=createWorkspace("javascript");
    p=upsertWorkspaceFile(p,"math.js","export const dobro = n => n*3;");
    p=upsertWorkspaceFile(p,"math.test.js",'import {dobro} from "./math.js"; if (dobro(2)!==4) throw Error("Dobro incorreto");');
    const prepared=await prepareWorkspaceTests(p);
    expect(()=>new Function(prepared.code)()).toThrow("Dobro incorreto");
  });
});
