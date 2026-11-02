import { LESSON_DEPTH } from "./lesson-depth";
export type Lesson = {
  id: string; title: string; week: number; objectives: string[]; explanation: string[];
  examples: { title: string; code: string }[]; exerciseId: string; tip: string;
};

const BASE_LESSONS: Lesson[] = [
  { id: "programa", week: 1, title: "O que é um programa?",
    objectives: ["Entender que um programa é uma lista de instruções", "Executar seu primeiro código"],
    explanation: [
      "Um programa é uma receita: uma sequência de instruções que o computador segue, uma por vez, de cima para baixo.",
      "O computador não adivinha. Ele faz exatamente o que está escrito — por isso um pequeno erro de digitação muda tudo.",
      "Python é uma linguagem pensada para ser legível. Aqui no CódigoLab o Python roda de verdade dentro do seu navegador.",
    ],
    examples: [{ title: "Uma instrução", code: 'print("Estou programando!")' }],
    exerciseId: "ex-ola", tip: "Leia o código em voz alta, linha por linha. Isso ajuda a perceber o que o computador fará." },
  { id: "print", week: 1, title: "Mostrando coisas com print()",
    objectives: ["Usar print() com textos e números", "Entender aspas e quebras de linha"],
    explanation: [
      "print() é uma função: um comando com nome, seguido de parênteses. O que vai dentro dos parênteses é mostrado na saída.",
      "Textos ficam entre aspas. Números não precisam de aspas. Vários valores separados por vírgula aparecem com espaço entre eles.",
    ],
    examples: [
      { title: "Textos e números", code: 'print("Idade:", 30)\nprint(2 + 3)' },
      { title: "Separador e fim", code: 'print("a", "b", "c", sep="-")\nprint("sem quebra", end="")\nprint("!")' },
    ],
    exerciseId: "ex-print-duas", tip: "Esqueceu de fechar aspas ou parênteses? Python mostra SyntaxError apontando a linha." },
  { id: "variaveis", week: 2, title: "Variáveis",
    objectives: ["Criar e atualizar variáveis", "Escolher bons nomes"],
    explanation: [
      "Uma variável é uma etiqueta que aponta para um valor. Com nome = \"Ana\" você cria a etiqueta nome.",
      "O sinal = em programação significa 'guarde', não 'é igual'. Você pode trocar o valor depois: idade = idade + 1.",
      "Nomes devem descrever o conteúdo, sem espaços nem acentos de preferência: preco_total, quantidade.",
    ],
    examples: [{ title: "Atualizando valores", code: "pontos = 10\nprint(pontos)\npontos = pontos + 5\nprint(pontos)" }],
    exerciseId: "ex-variaveis", tip: "Use o botão 'Simular passo a passo' no laboratório para ver a variável mudando." },
  { id: "tipos", week: 2, title: "Tipos de dados",
    objectives: ["Diferenciar str, int, float e bool", "Converter entre tipos"],
    explanation: [
      "Todo valor tem um tipo. \"10\" é texto (str); 10 é inteiro (int); 10.5 é decimal (float); True/False são booleanos (bool).",
      "type(valor) mostra o tipo. int(), float() e str() convertem. input() sempre devolve texto.",
    ],
    examples: [
      { title: "Descobrindo tipos", code: 'print(type("10"))\nprint(type(10))\nprint(type(10.5))\nprint(type(True))' },
      { title: "Cuidado com texto", code: 'print("2" + "3")\nprint(int("2") + int("3"))' },
    ],
    exerciseId: "ex-tipos", tip: "Erro TypeError: can only concatenate str... significa que você misturou texto com número." },
  { id: "operadores", week: 3, title: "Operadores",
    objectives: ["Fazer contas", "Comparar valores"],
    explanation: [
      "Aritméticos: + - * / (divisão decimal), // (divisão inteira), % (resto), ** (potência).",
      "Comparação: == != < > <= >= devolvem True ou False. Lógicos: and, or, not.",
      "A ordem segue a matemática; use parênteses para deixar claro.",
    ],
    examples: [{ title: "Contas e comparações", code: "print(7 / 2, 7 // 2, 7 % 2, 2 ** 3)\nprint(5 > 3, 5 == 3, 5 > 3 and 2 > 1)" }],
    exerciseId: "ex-operadores", tip: "= guarda; == compara. Trocar um pelo outro é um erro muito comum." },
  { id: "condicionais", week: 3, title: "Condicionais: if, elif, else",
    objectives: ["Tomar decisões no código", "Usar indentação corretamente"],
    explanation: [
      "if executa um bloco só se a condição for verdadeira. else é o caminho contrário. elif testa outra condição.",
      "O bloco é definido pela indentação (4 espaços). Os dois-pontos : no fim da linha são obrigatórios.",
    ],
    examples: [{ title: "Nota", code: 'nota = 6.5\nif nota >= 7:\n    print("aprovado")\nelif nota >= 5:\n    print("recuperação")\nelse:\n    print("reprovado")' }],
    exerciseId: "ex-if", tip: "IndentationError indica espaços errados no começo da linha." },
  { id: "loops", week: 4, title: "Repetição: for e while",
    objectives: ["Repetir instruções com for", "Entender while e o risco de laço infinito"],
    explanation: [
      "for percorre uma sequência: for i in range(3) executa o bloco com i = 0, 1, 2.",
      "while repete enquanto a condição for verdadeira. Se ela nunca ficar falsa, o laço é infinito — no laboratório, o botão Parar encerra a execução.",
    ],
    examples: [
      { title: "for com range", code: "for i in range(1, 4):\n    print('volta', i)" },
      { title: "while com contador", code: "n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1\nprint('fim')" },
    ],
    exerciseId: "ex-for", tip: "Num while, garanta que algo dentro do bloco altere a condição." },
  { id: "listas", week: 5, title: "Listas",
    objectives: ["Guardar vários valores", "Acessar, adicionar e percorrer itens"],
    explanation: [
      "Uma lista guarda vários valores em ordem: frutas = ['maçã', 'uva']. O primeiro item é o índice 0.",
      "append() adiciona no fim, len() conta itens, e for item in lista percorre um por um.",
    ],
    examples: [{ title: "Usando listas", code: "frutas = ['maçã', 'uva']\nfrutas.append('pera')\nprint(frutas[0], len(frutas))\nfor f in frutas:\n    print('-', f)" }],
    exerciseId: "ex-listas", tip: "IndexError: list index out of range = você pediu uma posição que não existe." },
  { id: "dicionarios", week: 5, title: "Dicionários",
    objectives: ["Associar chaves a valores", "Consultar com segurança"],
    explanation: [
      "Um dicionário liga chaves a valores, como uma agenda: {'Ana': '9999-0000'}.",
      "Acesse com d['chave'], verifique com 'chave' in d, e use d.get('chave', padrão) para evitar erro.",
    ],
    examples: [{ title: "Agenda", code: "idades = {'Ana': 30, 'Bia': 25}\nidades['Caio'] = 19\nfor nome, idade in idades.items():\n    print(nome, idade)\nprint(idades.get('Duda', 'desconhecida'))" }],
    exerciseId: "ex-dict", tip: "KeyError mostra a chave que não existe no dicionário." },
  { id: "funcoes", week: 6, title: "Funções",
    objectives: ["Criar funções com def", "Diferenciar print e return"],
    explanation: [
      "Uma função é um bloco de código com nome, que você define uma vez e usa várias vezes.",
      "Parâmetros são as entradas; return é a saída. Uma função sem return devolve None.",
    ],
    examples: [{ title: "Saudação", code: "def saudacao(nome):\n    return 'Olá, ' + nome + '!'\n\nprint(saudacao('Ana'))\nprint(saudacao('Bia'))" }],
    exerciseId: "ex-funcao", tip: "Se aparecer None na saída, provavelmente faltou um return." },
  { id: "arquivos", week: 7, title: "Arquivos",
    objectives: ["Escrever e ler arquivos de texto"],
    explanation: [
      "open(nome, 'w') abre para escrever (apaga o conteúdo anterior); 'a' acrescenta; 'r' (padrão) lê.",
      "O bloco with fecha o arquivo automaticamente. No CódigoLab os arquivos ficam num sistema de arquivos virtual na memória do navegador e somem ao recarregar o Python.",
    ],
    examples: [{ title: "Diário", code: "with open('diario.txt', 'w') as f:\n    f.write('Hoje aprendi arquivos\\n')\n\nwith open('diario.txt') as f:\n    print(f.read())" }],
    exerciseId: "ex-arquivo", tip: "FileNotFoundError: o nome do arquivo está errado ou ele ainda não foi criado." },
  { id: "erros", week: 7, title: "Erros e debugging",
    objectives: ["Ler uma mensagem de erro (traceback)", "Tratar erros com try/except"],
    explanation: [
      "Erros são informação, não fracasso. Leia o traceback de baixo para cima: a última linha diz o tipo do erro; acima, a linha onde ocorreu.",
      "Debugging é investigar: coloque print() para ver valores, isole a parte suspeita, teste hipóteses.",
      "try/except permite tratar erros esperados sem derrubar o programa.",
    ],
    examples: [
      { title: "Um erro real", code: "idade = '30'\nprint(idade + 1)" },
      { title: "Tratando", code: "try:\n    n = int('abc')\nexcept ValueError:\n    print('isso não é um número')" },
    ],
    exerciseId: "ex-erros", tip: "Não use except sem tipo para esconder tudo: você perde a pista do problema." },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export const LESSONS:Lesson[]=BASE_LESSONS.map(lesson=>({...lesson,explanation:[...lesson.explanation,...(LESSON_DEPTH[lesson.id]||[])]}));
