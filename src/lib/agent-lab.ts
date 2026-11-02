export type AgentDocument = { id: string; title: string; text: string };
export const AGENT_DOCUMENTS: AgentDocument[] = [
  { id: "revisao", title: "Revisão espaçada", text: "A revisão espaçada distribui o estudo em intervalos crescentes. Recupere o conceito sem consultar as anotações, confira a resposta e revise novamente após 1, 3 e 7 dias. Erros indicam que o próximo intervalo deve ser menor." },
  { id: "http", title: "Contratos HTTP", text: "HTTP organiza requisições e respostas. GET consulta recursos, POST cria, PATCH altera e DELETE exclui. O código 201 informa criação, 401 exige autenticação, 404 indica recurso inexistente e 422 indica dados inválidos." },
  { id: "rag", title: "RAG e evidências", text: "RAG recupera documentos relevantes antes de elaborar uma resposta. A recuperação pode ser lexical ou vetorial. Citar fontes e recusar perguntas sem evidência reduz respostas inventadas. Um índice lexical não é um modelo generativo." },
  { id: "mcp", title: "Ferramentas e MCP", text: "MCP permite descobrir e chamar ferramentas por mensagens JSON-RPC. tools/list lista ferramentas e seus schemas. tools/call envia nome e argumentos validados. O transporte pode ser stdio ou Streamable HTTP. Este laboratório implementa mensagens locais, sem transporte de rede." },
];
const STOP = new Set(["como", "qual", "quais", "para", "com", "uma", "que", "dos", "das", "por", "funciona", "sobre", "the", "and", "this", "sao", "ser", "sua", "seu", "antes", "apos"]);
const terms = (text: string) => [...new Set(text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(word => word.length > 2 && !STOP.has(word)))];
export function parseAgentDocuments(text: string): AgentDocument[] {
  if (text.length > 100_000) throw new Error("Base de conhecimento limitada a 100 mil caracteres.");
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) throw new Error("Informe de 1 a 30 documentos.");
  const ids = new Set<string>();
  for (const doc of value) {
    if (!doc || typeof doc !== "object" || typeof doc.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(doc.id) || ids.has(doc.id) || typeof doc.title !== "string" || !doc.title.trim() || doc.title.length > 120 || typeof doc.text !== "string" || !doc.text.trim() || doc.text.length > 10_000) throw new Error("Cada documento exige id único, title (até 120) e text (até 10 mil caracteres).");
    ids.add(doc.id);
  }
  return value as AgentDocument[];
}
export function retrieveDocuments(query: string, documents: AgentDocument[], limit = 3): Array<{ document: AgentDocument; score: number }> {
  const queryTerms = terms(query.slice(0, 1000));
  if (!queryTerms.length) return [];
  const corpus = documents.slice(0, 30).map(document => ({ document, tokens: terms(document.title + " " + document.text) }));
  return corpus.map(({ document, tokens }) => {
    const score = queryTerms.reduce((sum, term) => !tokens.includes(term) ? sum : sum + 1 + Math.log((corpus.length + 1) / (corpus.filter(doc => doc.tokens.includes(term)).length + 1)), 0);
    return { document, score: Math.round(score * 100) / 100 };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id)).slice(0, Math.max(1, Math.min(10, limit)));
}
/** Fluxo determinístico: retrieval lexical seguido de extratos; não usa nem simula LLM. */
export function runAgent(query: string, documents: AgentDocument[]) {
  const retrieved = retrieveDocuments(query, documents, 3);
  const sources = retrieved.map(result => result.document);
  return {
    answer: sources.length ? sources.map(doc => `[${doc.id}] ${doc.text}`).join("\n\n") : "Não encontrei evidência na base para responder. Acrescente um documento pertinente ou reformule a pergunta.",
    sources,
    trace: [
      { stage: "planejar", detail: "Procurar termos relevantes na base; responder somente com extratos das fontes." },
      { stage: "recuperar", detail: retrieved.length ? retrieved.map(result => `${result.document.id}: escore lexical ${result.score}`).join("; ") : "Nenhuma correspondência lexical." },
      { stage: "responder", detail: sources.length ? `${sources.length} fonte(s) citada(s). Nenhum texto foi gerado por modelo.` : "Abstenção por ausência de evidência." },
    ],
  };
}
export const MCP_TOOLS = [
  { name: "somar", description: "Soma dois números finitos, sem avaliar código.", inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"], additionalProperties: false } },
  { name: "buscar_documentos", description: "Busca lexical na base de treino.", inputSchema: { type: "object", properties: { query: { type: "string", minLength: 1, maxLength: 1000 } }, required: ["query"], additionalProperties: false } },
] as const;
/** Subconjunto didático de mensagens MCP 2025-06-18. Não é um transporte de rede. */
export function handleMcpMessage(message: string, documents: AgentDocument[]): unknown {
  const failure = (id: unknown, code: number, text: string) => ({ jsonrpc: "2.0", id, error: { code, message: text } });
  if (message.length > 12_000) return failure(null, -32600, "Mensagem limitada a 12 mil caracteres.");
  let request: Record<string, unknown>;
  try { request = JSON.parse(message) as Record<string, unknown>; } catch { return failure(null, -32700, "JSON inválido."); }
  if (!request || Array.isArray(request) || request["jsonrpc"] !== "2.0" || typeof request["method"] !== "string") return failure(null, -32600, "Mensagem JSON-RPC 2.0 inválida.");
  const id = request["id"];
  if (id !== undefined && typeof id !== "string" && (typeof id !== "number" || !Number.isSafeInteger(id))) return failure(null, -32600, "id deve ser string ou inteiro.");
  if (id === undefined) return null; // JSON-RPC notifications never receive responses.
  const result = (value: unknown) => ({ jsonrpc: "2.0", id, result: value });
  const method = request["method"];
  if (method === "ping") return result({});
  if (method === "initialize") return result({ protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "codigolab-local-didatico", version: "1.0.0" }, instructions: "Ambiente didático local; sem modelo generativo ou transporte de rede." });
  if (method === "tools/list") return result({ tools: MCP_TOOLS });
  if (method !== "tools/call") return failure(id, -32601, "Método não encontrado no subconjunto didático.");
  const params = request["params"] as Record<string, unknown> | undefined;
  if (!params || typeof params !== "object" || Array.isArray(params) || typeof params["name"] !== "string") return failure(id, -32602, "Informe params.name e params.arguments.");
  const args = params["arguments"] as Record<string, unknown> | undefined;
  if (!args || typeof args !== "object" || Array.isArray(args)) return failure(id, -32602, "arguments deve ser objeto.");
  const toolError = (text: string) => result({ content: [{ type: "text", text }], isError: true });
  if (params["name"] === "somar") {
    if (Object.keys(args).some(key => !["a", "b"].includes(key)) || typeof args["a"] !== "number" || typeof args["b"] !== "number" || !Number.isFinite(args["a"]) || !Number.isFinite(args["b"]) || !Number.isFinite(args["a"] + args["b"])) return toolError("a e b devem ser números finitos, com soma finita.");
    return result({ content: [{ type: "text", text: String(args["a"] + args["b"]) }], isError: false });
  }
  if (params["name"] === "buscar_documentos") {
    if (Object.keys(args).some(key => key !== "query") || typeof args["query"] !== "string" || !args["query"].trim() || args["query"].length > 1000) return toolError("query deve conter entre 1 e 1.000 caracteres.");
    return result({ content: [{ type: "text", text: JSON.stringify(retrieveDocuments(args["query"], documents).map(item => ({ id: item.document.id, title: item.document.title, text: item.document.text, score: item.score }))) }], isError: false });
  }
  return failure(id, -32602, "Ferramenta desconhecida.");
}
export const AGENT_EVALUATION_CASES = [
  { query: "Como fazer revisão espaçada?", expectedId: "revisao" },
  { query: "HTTP código 401", expectedId: "http" },
  { query: "RAG recuperação lexical", expectedId: "rag" },
  { query: "MCP tools/list", expectedId: "mcp" },
];
export function evaluateRetrieval(documents: AgentDocument[], cases: Array<{ query: string; expectedId: string }>, topK = 1) {
  const results = cases.slice(0, 100).map(test => {
    const actualIds = retrieveDocuments(test.query, documents, topK).map(item => item.document.id);
    return { ...test, actualIds, passed: actualIds.includes(test.expectedId) };
  });
  const hits = results.filter(result => result.passed).length;
  return { hits, total: results.length, accuracy: results.length ? hits / results.length : 0, results };
}
