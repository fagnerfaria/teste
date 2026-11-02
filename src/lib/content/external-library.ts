import { EXTERNAL_RECORDS } from "./external-records";

export type SourceId = "30-dias-python" | "ubl" | "freecodecamp" | "aprenda-community";
export type ExternalKind = "document" | "directory";
export type ExternalItem = { sourceId: SourceId; path: string; kind: ExternalKind; title: string; category: string };
export type ExternalSource = {
  id: SourceId; name: string; repository: string; branch: string;
  website: string; language: string; licenseNote: string; previewAllowed: boolean;
};

/**
 * Metadados e caminhos públicos: sem distribuir textos ou alterar autoria.
 * O conteúdo permanece nos projetos originais; visualização remota é facultativa.
 * Nem toda dependência, imagem ou vídeo externo está coberto pela licença do repositório.
 */
export const EXTERNAL_SOURCES: readonly ExternalSource[] = [
  {
    id:"30-dias-python", name:"30 Dias de Python", repository:"Asabeneh/30-Days-Of-Python", branch:"master",
    website:"https://github.com/Asabeneh/30-Days-Of-Python/tree/master/Portuguese",
    language:"Português, tradução comunitária",
    licenseNote:"Licenciamento da tradução e dos arquivos deve ser conferido na origem antes de reutilização; o CódigoLab mantém apenas o índice e o acesso ao original.",
    previewAllowed:false,
  },
  {
    id:"ubl", name:"Universidade Brasileira Livre", repository:"Universidade-Livre/ciencia-da-computacao", branch:"main",
    website:"https://github.com/Universidade-Livre/ciencia-da-computacao",
    language:"Português",
    licenseNote:"O repositório declara licença MIT. Cursos, vídeos e livros indicados pertencem a terceiros e podem ter licenças diferentes.",
    previewAllowed:true,
  },
  {
    id:"freecodecamp", name:"freeCodeCamp", repository:"freeCodeCamp/freeCodeCamp", branch:"main",
    website:"https://www.freecodecamp.org/learn",
    language:"Principalmente inglês",
    licenseNote:"Conteúdos educacionais e código possuem condições de licença diferentes; os certificados e a avaliação oficial pertencem ao freeCodeCamp.",
    previewAllowed:false,
  },
  {
    id:"aprenda-community", name:"Aprenda Community", repository:"lucianodiisouza/aprenda-community", branch:"main",
    website:"https://github.com/lucianodiisouza/aprenda-community",
    language:"Português",
    licenseNote:"O projeto declara CC BY-SA 4.0 para conteúdo e AGPL-3.0 para código; o material remoto recebe crédito e não é apresentado como curso original do CódigoLab.",
    previewAllowed:true,
  },
];

const getSource = (id: string) => {
  const source = EXTERNAL_SOURCES.find(s => s.id === id);
  if (!source) throw new Error("Fonte não reconhecida");
  return source;
};

/** Restringe caminhos ao namespace de um repositório conhecido. */
export function normalizeExternalPath(path: string): string {
  if (typeof path !== "string" || path.length > 700 || !path || path.startsWith("/") || path.includes("\\") || path.includes("?") || path.includes("#")) {
    throw new Error("Caminho externo inválido");
  }
  let decoded: string;
  try { decoded = decodeURIComponent(path); } catch { throw new Error("Codificação de caminho inválida"); }
  if (decoded.includes("%") || decoded.startsWith("/") || decoded.includes("\\") ||
      decoded.includes("?") || decoded.includes("#") ||
      decoded.split("/").some(p => !p || p === "." || p === ".." || p.startsWith("."))) {
    throw new Error("Caminho externo não autorizado");
  }
  return decoded;
}

export function buildSourceUrl(sourceId: string, path: string, kind: ExternalKind = "document"): string {
  const source = getSource(sourceId);
  const safe = normalizeExternalPath(path).split("/").map(encodeURIComponent).join("/");
  const action = kind === "directory" ? "tree" : "blob";
  return `https://github.com/${source.repository}/${action}/${source.branch}/${safe}`;
}

export function buildRawUrl(sourceId: string, path: string): string {
  const source = getSource(sourceId);
  const safe = normalizeExternalPath(path).split("/").map(encodeURIComponent).join("/");
  if (!source.previewAllowed || !/\.(md|mdx)$/i.test(safe)) throw new Error("Prévia não autorizada para este material");
  return `https://raw.githubusercontent.com/${source.repository}/${source.branch}/${safe}`;
}

function readableTitle(path: string, kind: ExternalKind): string {
  const name = path.split("/").at(-1) || path;
  const cleaned = kind === "directory" ? name : name.replace(/\.(mdx?|ya?ml|json)$/i, "").replace(/^\d+[_-]/, "");
  return cleaned.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
}

function category(path: string): string {
  if (path.startsWith("Portuguese/")) return "Dias de estudo";
  if (path.startsWith("extras/bibliography/")) return "Disciplinas de Ciência da Computação";
  if (path.startsWith("specializations/")) return "Especializações";
  if (path.startsWith("curriculum/challenges/english/blocks/")) return "Blocos de desafios";
  if (path.startsWith("curriculum/challenges/english/certifications/")) return "Mapas de certificação";
  if (path.startsWith("roadmaps/")) return "Trilhas e aulas";
  if (path.startsWith("projects/")) return "Projetos";
  if (path.startsWith("bootcamps/")) return "Bootcamps";
  return "Biblioteca";
}

export const EXTERNAL_ITEMS: readonly ExternalItem[] = EXTERNAL_RECORDS.map(([id, path, kind]) => ({
  sourceId: id as SourceId,
  path, kind,
  title: readableTitle(path, kind),
  category: category(path),
}));

export function filterExternalItems(sourceId: string, query: string, categoryName = ""): ExternalItem[] {
  const q = query.trim().toLocaleLowerCase("pt-BR");
  return EXTERNAL_ITEMS.filter(i =>
    (!sourceId || i.sourceId === sourceId) &&
    (!categoryName || i.category === categoryName) &&
    (!q || (i.title + " " + i.path + " " + i.category).toLocaleLowerCase("pt-BR").includes(q))
  );
}
