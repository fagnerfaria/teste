import { describe,it,expect } from "vitest";
import { validateBranchName,GIT_STEPS } from "../lib/git-lessons";
describe("Laboratório Git local",()=>{
 it("ensina o ciclo de trabalho Git com passos reais e verificáveis",()=>{
  expect(GIT_STEPS.map(s=>s.id)).toEqual(["init","edit","stage","commit","branch","checkout","log"]);
  expect(GIT_STEPS.every(s=>s.command.startsWith("git "))).toBe(true);
 });
 it("restringe nomes para branches locais e evita opções como caminhos",()=>{
  for(const x of ["","-rf","../main","foo..bar","a\\b","refs/heads/main","a b",".hidden","main.lock"])
   expect(()=>validateBranchName(x)).toThrow();
  expect(validateBranchName("feature/testes")).toBe("feature/testes");
  expect(validateBranchName("experimento")).toBe("experimento");
 });
});
