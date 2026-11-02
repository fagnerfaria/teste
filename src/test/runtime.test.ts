import { describe,expect,it } from "vitest";
import { normalizeOutput } from "../lib/runtime";
import { LESSONS } from "../lib/content/lessons";
import { EXERCISES } from "../lib/content/exercises";
import { SIMULATIONS } from "../lib/content/simulations";
import { COURSES } from "../lib/content/courses";
describe("CódigoLab: organização do aprendizado",()=>{
 it("possui quatro fontes de aprendizagem",()=>expect(COURSES).toHaveLength(4));
 it("mantém trilha inicial de doze aulas e exercícios",()=>{expect(LESSONS.length).toBeGreaterThanOrEqual(12);expect(EXERCISES.length).toBeGreaterThanOrEqual(12);});
 it("tem três simulações distintas com passos válidos",()=>{expect(SIMULATIONS).toHaveLength(3);for(const s of SIMULATIONS){expect(s.steps.length).toBeGreaterThan(1);expect(s.steps.every(p=>p.line>=1)).toBe(true);}});
});
describe("Correção de saída real",()=>{
 it("normaliza CRLF, espaços finais e linhas vazias de encerramento",()=>expect(normalizeOutput("olá  \r\nmundo \r\n\r\n")).toBe("olá\nmundo"));
 it("preserva diferenças relevantes",()=>expect(normalizeOutput("Olá\n")).not.toBe(normalizeOutput("olá\n")));
});