export const GLOSSARY: { term: string; def: string }[] = [
  { term: "Algoritmo", def: "Sequência de passos para resolver um problema. Uma receita de bolo é um algoritmo." },
  { term: "Bug", def: "Erro no programa que faz ele se comportar diferente do esperado." },
  { term: "Debugging", def: "Investigar e corrigir bugs: ler erros, inspecionar valores, testar hipóteses." },
  { term: "Função", def: "Bloco de código com nome que pode receber entradas (parâmetros) e devolver uma saída (return)." },
  { term: "Indentação", def: "Espaços no começo da linha. Em Python ela define quais linhas pertencem a um bloco." },
  { term: "Laço (loop)", def: "Estrutura que repete instruções: for percorre itens; while repete enquanto algo for verdadeiro." },
  { term: "Lista", def: "Coleção ordenada de valores, acessados por posição (índice), começando em 0." },
  { term: "Dicionário", def: "Coleção de pares chave → valor, como uma agenda de nomes e telefones." },
  { term: "Stdout / Stderr", def: "Saída padrão (o que print mostra) e saída de erro (mensagens de problema)." },
  { term: "String", def: "Texto. Em Python fica entre aspas simples ou duplas." },
  { term: "Tipo", def: "Categoria de um valor: int (inteiro), float (decimal), str (texto), bool (verdadeiro/falso)." },
  { term: "Traceback", def: "Relatório de erro do Python. A última linha diz o tipo do erro; acima, onde aconteceu." },
  { term: "Variável", def: "Nome que aponta para um valor guardado na memória." },
  { term: "Web Worker", def: "Processo separado do navegador que roda código sem travar a tela. O laboratório usa isso." },
  { term: "Pyodide", def: "Python completo compilado para rodar dentro do navegador. É o que executa seu Python aqui." },
  { term: "Sandbox", def: "Ambiente isolado com permissões limitadas, para o código não afetar o resto do sistema." },
];

export const COMMON_ERRORS: { match: RegExp; tip: string }[] = [
  { match: /SyntaxError/, tip: "Erro de sintaxe: confira aspas, parênteses e dois-pontos (:) no fim de if/for/def." },
  { match: /IndentationError/, tip: "Indentação incorreta: use 4 espaços dentro de blocos e mantenha o mesmo alinhamento." },
  { match: /NameError/, tip: "Nome não encontrado: a variável foi criada antes? O nome está escrito igual (maiúsculas contam)?" },
  { match: /TypeError.*(concatenate|unsupported operand)/, tip: "Mistura de tipos: converta com int(), float() ou str() antes de juntar." },
  { match: /ValueError.*int\(\)/, tip: "Texto que não é número foi passado para int(). Verifique a entrada." },
  { match: /ZeroDivisionError/, tip: "Divisão por zero: verifique o divisor antes de dividir." },
  { match: /IndexError/, tip: "Posição inexistente na lista. Lembre: índices vão de 0 até len(lista) - 1." },
  { match: /KeyError/, tip: "Chave inexistente no dicionário. Use 'in' ou .get() para checar." },
  { match: /EOFError/, tip: "O programa pediu input() mas não havia entrada. Preencha o campo 'Entrada (stdin)'." },
  { match: /ReferenceError/, tip: "JavaScript: variável não declarada. Use let ou const antes de usar." },
];

export const explainError = (stderr: string) => COMMON_ERRORS.find((e) => e.match.test(stderr))?.tip;