import { describe, expect, it } from "vitest";
import { retrieveDocuments, runAgent, handleMcpMessage, evaluateRetrieval, parseAgentDocuments, AGENT_DOCUMENTS } from "../lib/agent-lab";

describe("RAG lexical local", () => {
  it("recupera fonte pertinente, preserva proveniência e recusa pergunta sem evidência", () => {
    const results = retrieveDocuments("Como funciona a revisão espaçada?", AGENT_DOCUMENTS);
    expect(results[0]?.document.id).toBe("revisao");
    const answer = runAgent("Como funciona a revisão espaçada?", AGENT_DOCUMENTS);
    expect(answer.sources[0]?.id).toBe("revisao");
    expect(answer.answer).toContain("intervalos");
    expect(answer.trace.map(step => step.stage)).toEqual(["planejar", "recuperar", "responder"]);
    expect(runAgent("fotossíntese clorofila", AGENT_DOCUMENTS).sources).toEqual([]);
    expect(runAgent("fotossíntese clorofila", AGENT_DOCUMENTS).answer).toContain("Não encontrei");
  });
});
describe("Avaliação reproduzível da recuperação", () => {
  it("mede acerto top-1 contra ids esperados e registra a falha", () => {
    const score = evaluateRetrieval(AGENT_DOCUMENTS, [
      { query: "revisão espaçada", expectedId: "revisao" },
      { query: "HTTP código 401", expectedId: "http" },
      { query: "clorofila", expectedId: "rag" },
    ]);
    expect(score.hits).toBe(2);
    expect(score.total).toBe(3);
    expect(score.accuracy).toBeCloseTo(2 / 3);
    expect(score.results[2]?.passed).toBe(false);
    expect(() => parseAgentDocuments('[{"id":"x","title":"t","text":"a"},{"id":"x","title":"t","text":"b"}]')).toThrow(/único/);
  });
});
describe("Mensagens MCP locais", () => {
  it("descobre ferramentas, valida argumentos e conserva ids JSON-RPC", () => {
    type RpcResponse = { id: string | number; result: { capabilities: { tools: object }; tools: Array<{ name: string }>; content: Array<{ type: string; text: string }>; isError: boolean }; error: { code: number } };
    const rpc = (value: unknown) => handleMcpMessage(JSON.stringify(value), AGENT_DOCUMENTS) as RpcResponse;
    const init = rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
    expect(init["result"].capabilities.tools).toEqual({});
    const list = rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(list["result"].tools.map(tool => tool.name)).toEqual(["somar", "buscar_documentos"]);
    const call = rpc({ jsonrpc: "2.0", id: "calculo", method: "tools/call", params: { name: "somar", arguments: { a: 12.5, b: 7.5 } } });
    expect(call["id"]).toBe("calculo");
    expect(call["result"].content).toEqual([{ type: "text", text: "20" }]);
    expect(rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "somar", arguments: { a: "12", b: 2 } } })["result"].isError).toBe(true);
    expect(rpc({ jsonrpc: "2.0", id: 4, method: "ferramenta_inexistente" })["error"].code).toBe(-32601);
    expect(handleMcpMessage('{', AGENT_DOCUMENTS)).toMatchObject({ error: { code: -32700 } });
    expect(rpc({ jsonrpc: "2.0", method: "notifications/initialized" })).toBe(null);
  });
});
