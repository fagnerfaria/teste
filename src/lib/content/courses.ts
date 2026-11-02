export type Course = {
  id: string; title: string; org: string; language: string; level: string; description: string;
  links: { label: string; url: string }[]; modules: string[]; adaptedLessons: boolean;
};

export const COURSES: Course[] = [
  {
    id: "30-dias-python", title: "30 Dias de Python", org: "Asabeneh (tradução da comunidade)",
    language: "Português", level: "Iniciante",
    description: "Desafio diário que cobre a linguagem Python do zero: tipos, estruturas de dados, funções, módulos e mais. Bom para manter ritmo diário.",
    links: [{ label: "Abrir material original (GitHub)", url: "https://github.com/Asabeneh/30-Days-Of-Python/blob/master/Portuguese/README.md" }],
    modules: ["Introdução e instalação", "Variáveis e funções embutidas", "Operadores", "Strings", "Listas, tuplas, sets e dicionários", "Condicionais e laços", "Funções e módulos"],
    adaptedLessons: true,
  },
  {
    id: "ubl", title: "Universidade Brasileira Livre — Ciência da Computação", org: "Comunidade Universidade-Livre",
    language: "Português", level: "Iniciante a avançado",
    description: "Grade curricular de Ciência da Computação montada com cursos gratuitos. Os documentos do repositório estão incorporados sob MIT; cursos, livros e vídeos de terceiros continuam na origem.",
    links: [{ label: "Abrir material original (GitHub)", url: "https://github.com/Universidade-Livre/ciencia-da-computacao" }],
    modules: ["Introdução à computação", "Matemática discreta", "Algoritmos e estruturas de dados", "Sistemas operacionais", "Redes", "Banco de dados"],
    adaptedLessons: false,
  },
  {
    id: "freecodecamp", title: "freeCodeCamp", org: "freeCodeCamp.org",
    language: "Inglês (parte em português)", level: "Iniciante a intermediário",
    description: "Currículo interativo gratuito com certificações próprias do freeCodeCamp: web responsiva, JavaScript, Python e mais. Os exercícios são feitos no site deles.",
    links: [
      { label: "Abrir currículo (freecodecamp.org/learn)", url: "https://www.freecodecamp.org/learn" },
      { label: "Repositório no GitHub", url: "https://github.com/freeCodeCamp/freeCodeCamp" },
    ],
    modules: ["Design web responsivo", "Algoritmos e estruturas de dados em JavaScript", "Bibliotecas front-end", "Python científico"],
    adaptedLessons: false,
  },
  {
    id: "aprenda-community", title: "Aprenda Community", org: "lucianodiisouza e comunidade",
    language: "Português", level: "Iniciante",
    description: "Percursos completos em português com explicações, questões e desafios. Os textos autorizados de roadmaps/** estão incorporados ao leitor local com atribuição CC BY-SA 4.0.",
    links: [{ label: "Abrir material original (GitHub)", url: "https://github.com/lucianodiisouza/aprenda-community" }],
    modules: ["Lógica de programação", "Front-end", "Back-end", "Git e GitHub", "Carreira"],
    adaptedLessons: false,
  },
];

export const FUTURE_TRACKS = [
  {title:"Python",status:"Disponível",note:"Fundamentos, estruturas de dados e algoritmos com exercícios executáveis."},
  {title:"Web (HTML, CSS, JS)",status:"Disponível",note:"Aulas, projeto responsivo e laboratório web."},
  {title:"Git e GitHub",status:"Disponível",note:"Versionamento real no navegador, revisão e CI."},
  {title:"APIs",status:"Disponível",note:"Contratos, erros, paginação, autenticação e prática local."},
  {title:"Automação",status:"Disponível",note:"Fluxos, arquivos, idempotência e ferramentas."},
  {title:"Fundamentos de IA",status:"Disponível",note:"RAG, avaliação, agentes e segurança com laboratórios locais."},
];
