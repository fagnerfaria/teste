import type { Exercise } from "./content/exercises";
import { normalizeOutput, type Lang, type RunResult, type RunStatus } from "./runtime";
export type CaseResult = { label: string; ok: boolean; expected: string; got: string; stderr: string; status: RunStatus; feedback: string };
type Run = (lang: Lang, code: string, options: { stdin: string; timeoutMs: number }) => Promise<RunResult>;
const EDGE_CASES: Record<string, { stdin: string; expected: string; label: string }[]> = {
  "ex-tipos": [{ stdin: "0", expected: "0", label: "Borda: zero" }, { stdin: "-3", expected: "-6", label: "Borda: negativo" }],
  "ex-if": [{ stdin: "-3", expected: "ímpar", label: "Borda: ímpar negativo" }, { stdin: "-8", expected: "par", label: "Borda: par negativo" }],
  "ex-dict": [{ stdin: "pão", expected: "1.5", label: "Segundo produto válido" }, { stdin: "", expected: "não encontrado", label: "Borda: produto vazio" }],
  "ex-erros": [{ stdin: "0\n2", expected: "0", label: "Borda: numerador zero" }, { stdin: "-7\n2", expected: "-4", label: "Divisão inteira negativa" }],
  "desafio-vogais": [{ stdin: "", expected: "0", label: "Borda: frase vazia" }, { stdin: "AEIOU aeiou", expected: "10", label: "Maiúsculas e minúsculas" }, { stdin: "xyz", expected: "0", label: "Sem vogais" }],
};
const ASSERTIONS: Record<string, string> = {
  "ex-funcao": '\nassert callable(globals().get("area")), "Defina a função area(largura, altura)."\nassert area(0, 5) == 0, "Confira largura zero."\nassert area(2.5, 4) == 10, "Confira dimensões decimais."\n',
  "ex-variaveis": '\nassert globals().get("nome") == "Ana" and globals().get("idade") == 30, "Crie as variáveis nome e idade com os valores pedidos."\n',
  "ex-arquivo": '\nwith open("notas.txt") as _arquivo_avaliado:\n    assert _arquivo_avaliado.read().splitlines() == ["linha 1", "linha 2"], "O arquivo deve conter as duas linhas pedidas."\n',
};
export async function assessExercise(ex: Exercise, code: string, options: { timeoutMs: number; run: Run; signal?: AbortSignal }): Promise<{ verdict: "passed" | "failed" | "unavailable" | "stopped"; results: CaseResult[] }> {
  const results: CaseResult[] = [];
  const tests = [...ex.tests, ...(EDGE_CASES[ex.id] ?? [])];
  for (const [index, test] of tests.entries()) {
    if (options.signal?.aborted) return { verdict: "stopped", results };
    let response: RunResult;
    try { response = await options.run(ex.lang ?? "python", code + (ASSERTIONS[ex.id] ?? ""), { stdin: test.stdin ?? "", timeoutMs: options.timeoutMs }); }
    catch { return { verdict: "unavailable", results }; }
    const got = normalizeOutput(response.stdout), expected = normalizeOutput(test.expected);
    const ok = response.status === "ok" && got === expected;
    const feedback = response.status === "timeout" ? "O programa excedeu o tempo. Verifique a condição de parada e quantas entradas são lidas." : response.status === "error" ? "A execução encontrou um erro. Leia a última linha da mensagem e revise a linha indicada." : outputFeedback(expected, got);
    results.push({ label: test.label ?? `Caso ${index + 1}${test.stdin !== undefined ? ` (entrada: ${test.stdin.replace(/\n/g, " ⏎ ") || "vazia"})` : ""}`, ok, expected, got, stderr: response.stderr, status: response.status, feedback });
    if (response.status === "unavailable" || response.status === "stopped" || options.signal?.aborted) return { verdict: response.status === "unavailable" ? "unavailable" : "stopped", results };
  }
  return { verdict: results.length > 0 && results.every(result => result.ok) ? "passed" : "failed", results };
}

export function outputFeedback(expected: string, got: string) {
  if (expected === got) return "A saída coincide com o resultado esperado neste caso.";
  const wanted = expected.split("\n"), actual = got.split("\n");
  for (let line = 0; line < Math.max(wanted.length, actual.length); line++) {
    if (wanted[line] === actual[line]) continue;
    if (actual[line] === undefined) return `Faltou a linha ${line + 1}. Confira se a impressão está dentro ou fora do laço.`;
    if (wanted[line] === undefined) return `Há uma linha ${line + 1} extra. Remova mensagens auxiliares da saída final.`;
    if (wanted[line]!.toLocaleLowerCase() === actual[line]!.toLocaleLowerCase()) return `A linha ${line + 1} difere em maiúsculas ou minúsculas.`;
    return `Primeira diferença na linha ${line + 1}. Confira tipos, operações e casos de borda; evite fixar o resultado da primeira entrada.`;
  }
  return "Revise a saída produzida.";
}
