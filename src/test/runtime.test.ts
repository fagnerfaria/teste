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
import { afterEach, vi } from "vitest";
import { runCode, resetPython, stopCurrent } from "../lib/runtime";

class FakeWorker extends EventTarget {
 static instances: FakeWorker[]=[];
 terminated=false;
 onerror: ((event:{message:string})=>void)|null=null;
 constructor(_url: unknown){super();FakeWorker.instances.push(this);}
 terminate(){this.terminated=true;}
 postMessage(message:{id:number}){
  this.dispatchEvent(new MessageEvent("message",{data:{type:"out",id:message.id,stream:"stdout",text:"x".repeat(200001)}}));
  this.dispatchEvent(new MessageEvent("message",{data:{type:"done",id:message.id,ok:true}}));
 }
}

describe("limites e cancelamento do executor",()=>{
 afterEach(()=>{resetPython();vi.unstubAllGlobals();FakeWorker.instances=[];});
 it("interrompe uma única mensagem que excede o limite de saída",async()=>{
   vi.stubGlobal("Worker",FakeWorker);
   const messages:string[]=[];
   const result=await runCode("javascript","console.log('x')",{timeoutMs:1000,onChunk:chunk=>messages.push(chunk.text)});
   expect(result.status).toBe("error");
   expect(result.stdout.length).toBeLessThanOrEqual(200000);
   expect(result.stderr).toContain("limite de 200 mil");
   expect(messages.join("")).toContain("limite de 200 mil");
 });
 it("conclui o cancelamento mesmo durante o carregamento inicial do Python",async()=>{
   vi.stubGlobal("Worker",FakeWorker);
   const execution=runCode("python","print('ok')",{timeoutMs:1000});
   stopCurrent();
   expect((await execution).status).toBe("stopped");
   expect(FakeWorker.instances[0]?.terminated).toBe(true);
 });
});
