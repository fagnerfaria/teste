import { type LearningUnit, type Track, type Capstone } from "./track-types";
import { PYTHON_PRO } from "./tracks-python";
import { WEB } from "./tracks-web";
import { ENGINEERING } from "./tracks-engineering";
import { AUTOMATION } from "./tracks-automation";
import { AI } from "./tracks-ai";
import { COMPUTER_SCIENCE } from "./tracks-cs";
import { LESSON_DEPTH } from "./lesson-depth";

export type { LearningUnit, Track, Capstone, ExampleLang, CodeChallenge, QuizChallenge } from "./track-types";
export const TRACKS: Track[] = [
 {id:"fundamentos",title:"01 · Fundamentos e Python",summary:"Do zero ao raciocínio algorítmico: variáveis, condições, listas, funções e erros.",prerequisites:"Nenhum. Comece aqui.",color:"sky",sources:["30-dias-python","ubl","aprenda-community"]},
 {id:"python-pro",title:"02 · Python intermediário",summary:"Compreensões, conjuntos, objetos, JSON, exceções e testes práticos.",prerequisites:"Conclua os fundamentos ou domine variáveis, laços e funções.",color:"violet",sources:["30-dias-python","ubl"]},
 {id:"web",title:"03 · Desenvolvimento web",summary:"HTML e CSS acessíveis, JavaScript, DOM, Promises, TypeScript e experiência mobile.",prerequisites:"Conheça lógica e funções.",color:"orange",sources:["freecodecamp","aprenda-community"]},
 {id:"engenharia",title:"04 · Ferramentas profissionais",summary:"Terminal, Git, versionamento, revisão, testes, CI, dados e segurança.",prerequisites:"Conclua ao menos uma trilha de linguagem.",color:"teal",sources:["ubl","aprenda-community","freecodecamp"]},
 {id:"automacao",title:"05 · APIs e automação",summary:"HTTP, dados, autenticação, paginação, retentativas, arquivos, fluxos e MCP.",prerequisites:"Saiba funções, JSON e HTTP básico.",color:"rose",sources:["ubl","aprenda-community"]},
 {id:"ia-agentes",title:"06 · Inteligência artificial e agentes",summary:"LLMs, prompts, ferramentas, RAG, embeddings, avaliações e supervisão.",prerequisites:"Tenha noções de APIs, programação e segurança.",color:"emerald",sources:["freecodecamp","ubl"]},
];
export const UNITS: LearningUnit[] = [...PYTHON_PRO,...WEB,...ENGINEERING,...AUTOMATION,...AI,...COMPUTER_SCIENCE].map(unit=>({...unit,explanation:[...unit.explanation,...(LESSON_DEPTH[unit.id]||[])]}));
export const unitsForTrack = (trackId: string) => UNITS.filter(u=>u.trackId===trackId);
export const unitById = (id:string) => UNITS.find(u=>u.id===id);
export const trackById = (id:string) => TRACKS.find(t=>t.id===id);

/** Projetos orientados por rubricas. Checklist é autoavaliação, não correção automática. */
export const PROJECTS: Capstone[] = [
 {id:"proj-calculadora",trackId:"fundamentos",title:"Calculadora pessoal de gastos",lang:"python",
  summary:"Transforme listas, funções e condicionais em um pequeno relatório de gastos, sem dados pessoais reais.",
  starter:'compras = [{"nome":"mercado","valor":18.5},{"nome":"transporte","valor":7.0}]\n# Some, conte e mostre um relatório simples\n',
  steps:["Crie uma lista de compras fictícias com valores numéricos.","Separe cálculo do total em uma função.","Apresente subtotal e quantidade no stdout.","Teste lista vazia e valores decimais.","Explique o resultado e registre seu código no backup."],
  acceptance:["O total coincide com a soma manual.","Lista vazia não provoca erro.","Números são apresentados de maneira consistente."],
  resources:["fundamentos","python-pro"]},
 {id:"proj-dados",trackId:"python-pro",title:"Analisador de JSON confiável",lang:"python",
  summary:"Receba registros fictícios, valide campos e gere um resumo sem presumir que os dados estão corretos.",
  starter:'import json\nentrada = \'[{"nome":"A","pontos":4},{"nome":"B","pontos":6}]\'\n# valide e resuma os dados\n',
  steps:["Converta texto JSON usando json.loads.","Verifique se é uma lista e se cada item possui nome e pontos.","Separe parsing, validação e cálculo em funções.","Mostre total e quantidade.","Simule JSON inválido e registre tratamento da exceção."],
  acceptance:["Campos ausentes causam erro claro ou rejeição explicada.","JSON inválido não é tratado como resultado confiável.","Exemplo válido produz total 10 e quantidade 2."],
  resources:["p2-json","p2-erros","p2-testes"]},
 {id:"proj-web",trackId:"web",title:"Painel de hábitos responsivo",lang:"html",
  summary:"Monte uma interface com formulário, lista e botão de adicionar, em uma única página isolada.",
  starter:'<main><h1>Hábitos</h1><label for="novo">Novo hábito</label><input id="novo"><button id="add">Adicionar</button><ul id="lista"></ul></main>\n<style>body{font-family:sans-serif;padding:16px;max-width:640px;margin:auto}</style>\n<script>// Adicione o clique com addEventListener</script>',
  steps:["Monte HTML semântico com label associado ao input.","Crie estilo legível em celular estreito.","Registre o evento de clique do botão.","Crie elemento li com textContent e acrescente na lista.","Teste entrada vazia e uso pelo teclado."],
  acceptance:["Nenhum código é injetado via innerHTML do usuário.","Campo e botão são acessíveis por teclado.","A lista funciona no preview HTML do laboratório."],
  resources:["w-html","w-css","w-dom"]},
 {id:"proj-ci",trackId:"engenharia",title:"Pipeline de testes do seu projeto",lang:"shell",
  summary:"Planeje um fluxo Git que execute verificações antes de publicar, sem executar comandos sensíveis automaticamente.",
  starter:'git switch -c feature/teste\n# crie mudanças pequenas\n# revise: git diff\n# execute testes locais\n# abra PR com evidências\n',
  steps:["Desenhe branches de produção e recurso.","Especifique comandos de build, testes e typecheck.","Redija critérios de aprovação do PR.","Simule um teste falhando e bloqueando deploy.","Documente reversão para a versão anterior."],
  acceptance:["A produção só recebe artefatos validados.","Segredos nunca estão em commits.","A regra de rollback é clara e executável manualmente."],
  resources:["e-git","e-reviews","e-ci"]},
 {id:"proj-api",trackId:"automacao",title:"Cliente de API com tratamento de falhas",lang:"javascript",
  summary:"Projete um cliente para uma API fictícia com validação de status, dados e limite de tentativas, sem precisar de token.",
  starter:'async function obterDados(){\n  // simule uma resposta HTTP e valide a estrutura\n  return {status:200,items:[1,2,3]};\n}\nconsole.log((await obterDados()).items.length);',
  steps:["Defina quais campos a API deve devolver.","Simule respostas HTTP 200, 429 e 500.","Valide JSON antes de utilizar seus campos.","Estabeleça no máximo três tentativas e trate erro final.","Explique como proteger um token real em backend."],
  acceptance:["Não há loop infinito de tentativas.","Status de erro não é apresentado como sucesso.","Nenhuma credencial real aparece no código do navegador."],
  resources:["a-http","a-json","a-retry"]},
 {id:"proj-agente",trackId:"ia-agentes",title:"Protótipo de agente verificável",lang:"javascript",
  summary:"Simule um agente de tarefas com decisões controladas, sem API paga nem ações reais em aplicativos externos.",
  starter:'const ferramentas = {listar: () => ["estudar Python","revisar testes"]};\nconst pedido="mostrar tarefas";\n// valide o pedido e registre uma decisão explícita\n',
  steps:["Defina objetivo, ferramentas autorizadas e ações proibidas.","Descreva contrato de entradas e saídas.","Implemente roteamento determinístico para um pedido simples.","Registre cada decisão sem capturar segredos.","Crie três avaliações: sucesso, dado ausente e ordem maliciosa."],
  acceptance:["Ações não permitidas são recusadas.","Resultados simulados são identificados como simulações.","Há casos de teste reproduzíveis e trilha de decisão."],
  resources:["ai-llm","ai-tools","ai-evals","ai-safety"]},
 {id:"proj-busca",trackId:"python-pro",title:"Catálogo com busca e validação",lang:"python",
  summary:"Implemente um catálogo ordenado com busca binária, preservando duplicatas e medindo comparações de forma determinística.",
  starter:'registros = [{"id":2,"nome":"B"},{"id":1,"nome":"A"},{"id":3,"nome":"C"}]\n# Valide, ordene por id e implemente buscar(registros, alvo).\n',
  steps:["Defina o contrato: ids inteiros únicos, nomes não vazios e ausência representada por None.","Valide entrada antes de ordenar e rejeite ids duplicados com erro explícito.","Separe validação, ordenação e busca em funções; a busca não deve modificar o catálogo.","Implemente busca binária e conte comparações sem medir tempo de parede.","Crie testes para primeiro, último, ausente, vazio e formato inválido.","Compare resultados com uma busca linear independente e exporte o código do workspace."],
  acceptance:["Buscar id 2 retorna o registro de nome B.","Catálogo vazio e id ausente retornam None.","Ids duplicados e registros sem nome são rejeitados antes da busca.","A entrada original permanece intacta.","Todos os testes independentes passam e a pré-condição de ordenação está documentada."],
  resources:["cs-busca","cs-ordenacao","p2-testes"]},
 {id:"proj-grafos",trackId:"python-pro",title:"Planejador de caminhos em grafo",lang:"python",
  summary:"Construa um mapa fictício e encontre caminhos mínimos sem pesos com BFS, incluindo ciclos, vértices isolados e validação.",
  starter:'grafo = {"A":["B","C"],"B":["D"],"C":["D"],"D":[],"E":[]}\n# Implemente caminho(grafo, origem, destino).\n',
  steps:["Declare se as arestas têm direção e registre que o exercício não aceita pesos.","Valide que todos os vizinhos existem no mapa.","Use deque, conjunto de visitados e mapa de predecessores.","Reconstrua o caminho do destino até a origem e inverta a sequência.","Teste origem igual ao destino, destino isolado, ciclo e vértice inexistente.","Explique por que BFS minimiza arestas e por que não resolve custos diferentes."],
  acceptance:["A→D produz A,B,D ou A,C,D, com duas arestas.","A→E retorna uma ausência explícita sem laço infinito.","A→A produz uma lista contendo somente A.","Um ciclo A→B→A não impede o término.","Uma referência a vértice inexistente produz erro claro."],
  resources:["cs-grafos","cs-pilha-fila","cs-complexidade"]},
];
