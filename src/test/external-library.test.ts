import { describe, expect, it } from "vitest";
import { EXTERNAL_SOURCES, EXTERNAL_ITEMS, buildSourceUrl, normalizeExternalPath, recommendedExternal } from "../lib/content/external-library";

describe("Biblioteca externa com atribuição e cobertura verificável", () => {
  it("indexa as quatro fontes oficiais, preservando autoria e licença", () => {
    expect(EXTERNAL_SOURCES.map(s => s.id)).toEqual(["30-dias-python", "ubl", "freecodecamp", "aprenda-community"]);
    for (const source of EXTERNAL_SOURCES) {
      expect(source.repository).toMatch(/^[\w.-]+\/[\w.-]+$/);
      expect(source.licenseNote.length).toBeGreaterThan(20);
      expect(source.website).toMatch(/^https:\/\//);
    }
  });
  it("indexa todos os 29 arquivos traduzidos disponíveis no 30 Dias e o mapa de disciplinas da UBL", () => {
    const python = EXTERNAL_ITEMS.filter(x => x.sourceId === "30-dias-python");
    const ubl = EXTERNAL_ITEMS.filter(x => x.sourceId === "ubl");
    expect(python.filter(x => x.path.endsWith(".md")).length).toBeGreaterThanOrEqual(29);
    expect(ubl.filter(x => x.path.includes("/bibliography/")).length).toBeGreaterThanOrEqual(35);
  });
  it("incorpora o índice de nós, trilhas e projetos Aprenda e blocos freeCodeCamp", () => {
    const aprenda = EXTERNAL_ITEMS.filter(x => x.sourceId === "aprenda-community");
    const fcc = EXTERNAL_ITEMS.filter(x => x.sourceId === "freecodecamp");
    expect(aprenda.filter(x => x.path.includes("/nodes/")).length).toBeGreaterThanOrEqual(450);
    expect(aprenda.filter(x => x.path.startsWith("projects/")).length).toBeGreaterThanOrEqual(17);
    expect(fcc.filter(x => x.kind === "directory").length).toBeGreaterThanOrEqual(500);
  });
  it("oferece referências de aprofundamento para todas as trilhas sem desviar de origem",()=>{
    for(const id of ["fundamentos","python-pro","web","engenharia","automacao","ia-agentes"]){
      const refs=recommendedExternal(id,12);
      expect(refs.length).toBeGreaterThanOrEqual(3);
      expect(refs.length).toBeLessThanOrEqual(12);
      expect(new Set(refs.map(x=>x.sourceId+":"+x.path)).size).toBe(refs.length);
      for(const ref of refs) expect(buildSourceUrl(ref.sourceId,ref.path,ref.kind)).toMatch(/^https:\/\/github\.com\//);
    }
    expect(recommendedExternal("inexistente")).toEqual([]);
  });
  it("não aceita path traversal e nunca constrói links fora dos repositórios", () => {
    expect(() => normalizeExternalPath("../secret")).toThrow();
    expect(() => normalizeExternalPath("folder/%2e%2e/x")).toThrow();
    expect(() => normalizeExternalPath("//evil")).toThrow();
    expect(() => buildSourceUrl("inexistente", "README.md")).toThrow();
    expect(buildSourceUrl("ubl", "README.md")).toBe("https://github.com/Universidade-Livre/ciencia-da-computacao/blob/main/README.md");
  });
  it("evita identificadores duplicados e caminhos que não pertencem às fontes", () => {
    expect(new Set(EXTERNAL_ITEMS.map(x => x.sourceId + ":" + x.path)).size).toBe(EXTERNAL_ITEMS.length);
    expect(EXTERNAL_ITEMS.every(x => EXTERNAL_SOURCES.some(s => s.id === x.sourceId))).toBe(true);
  });
});
