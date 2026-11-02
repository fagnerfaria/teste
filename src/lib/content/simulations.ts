// Traços preparados manualmente para exemplos selecionados. NÃO é um depurador genérico.
export type SimStep = { line: number; vars: Record<string, string>; output: string[]; note: string };
export type Simulation = { id: string; title: string; code: string; steps: SimStep[] };

export const SIMULATIONS: Simulation[] = [
  { id: "sim-var", title: "Variável + print",
    code: 'nome = "Ana"\nidade = 30\nidade = idade + 1\nprint(nome, idade)',
    steps: [
      { line: 1, vars: { nome: '"Ana"' }, output: [], note: 'Cria a variável nome com o texto "Ana".' },
      { line: 2, vars: { nome: '"Ana"', idade: "30" }, output: [], note: "Cria idade com o inteiro 30." },
      { line: 3, vars: { nome: '"Ana"', idade: "31" }, output: [], note: "Calcula idade + 1 (30 + 1 = 31) e guarda de volta em idade." },
      { line: 4, vars: { nome: '"Ana"', idade: "31" }, output: ["Ana 31"], note: "print mostra os dois valores separados por espaço." },
    ] },
  { id: "sim-if", title: "if / else",
    code: 'temperatura = 32\nif temperatura > 30:\n    print("Calor!")\nelse:\n    print("Agradável")\nprint("fim")',
    steps: [
      { line: 1, vars: { temperatura: "32" }, output: [], note: "Guarda 32 em temperatura." },
      { line: 2, vars: { temperatura: "32" }, output: [], note: "Testa 32 > 30 → True. Entra no bloco do if." },
      { line: 3, vars: { temperatura: "32" }, output: ["Calor!"], note: "Executa o bloco do if." },
      { line: 4, vars: { temperatura: "32" }, output: ["Calor!"], note: "O else é pulado, pois a condição foi verdadeira." },
      { line: 6, vars: { temperatura: "32" }, output: ["Calor!", "fim"], note: "Fora da indentação: roda sempre." },
    ] },
  { id: "sim-for", title: "Laço for com soma",
    code: "total = 0\nfor n in [2, 4, 6]:\n    total = total + n\nprint(total)",
    steps: [
      { line: 1, vars: { total: "0" }, output: [], note: "Acumulador começa em 0." },
      { line: 2, vars: { total: "0", n: "2" }, output: [], note: "1ª volta: n recebe o primeiro item, 2." },
      { line: 3, vars: { total: "2", n: "2" }, output: [], note: "total = 0 + 2 = 2" },
      { line: 2, vars: { total: "2", n: "4" }, output: [], note: "2ª volta: n = 4." },
      { line: 3, vars: { total: "6", n: "4" }, output: [], note: "total = 2 + 4 = 6" },
      { line: 2, vars: { total: "6", n: "6" }, output: [], note: "3ª volta: n = 6." },
      { line: 3, vars: { total: "12", n: "6" }, output: [], note: "total = 6 + 6 = 12" },
      { line: 2, vars: { total: "12", n: "6" }, output: [], note: "Não há mais itens: o laço termina." },
      { line: 4, vars: { total: "12", n: "6" }, output: ["12"], note: "Mostra o total." },
    ] },
];