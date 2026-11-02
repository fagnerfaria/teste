import { describe, expect, it } from "vitest";
import { assessExercise } from "../lib/assessment";
import type { Exercise } from "../lib/content/exercises";
const exercise: Exercise = { id: "double", title: "Dobro", level: 1, starter: "", prompt: "", hint: "", solution: "", solutionNotes: "", tests: [{ stdin: "2", expected: "4" }, { stdin: "0", expected: "0" }] };
describe("avaliação por comportamento", () => {
  it("não aprova a primeira saída se outra entrada falhar", async () => {
    const result = await assessExercise(exercise, "print(4)", { timeoutMs: 1000, run: async () => ({ status: "ok", stdout: "4\n", stderr: "", durationMs: 1 }) });
    expect(result.verdict).toBe("failed");
    expect(result.results.map(test => test.ok)).toEqual([true, false]);
    expect(result.results[1]?.feedback).toContain("linha 1");
  });
  it("recusa uma lista vazia de testes e não executa após cancelamento", async () => {
    const run = async () => { throw new Error("não deve executar"); };
    expect((await assessExercise({ ...exercise, tests: [] }, "", { timeoutMs: 1000, run })).verdict).toBe("failed");
    const controller = new AbortController(); controller.abort();
    expect((await assessExercise(exercise, "", { timeoutMs: 1000, run, signal: controller.signal })).verdict).toBe("stopped");
  });
  it("adiciona casos de borda ao dobro e exige que a função área seja implementada", async () => {
    const calls: { code: string; stdin: string }[] = [];
    const run = async (_lang: unknown, code: string, options: { stdin: string }) => { calls.push({ code, stdin: options.stdin }); return { status: "ok" as const, stdout: "", stderr: "", durationMs: 1 }; };
    await assessExercise({ ...exercise, id: "ex-tipos" }, "n=int(input())", { timeoutMs: 1000, run });
    expect(calls.map(call => call.stdin)).toContain("-3");
    calls.length = 0;
    await assessExercise({ ...exercise, id: "ex-funcao" }, "print(12)", { timeoutMs: 1000, run });
    expect(calls[0]?.code).toContain("assert callable");
  });
});
