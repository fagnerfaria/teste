export type ExampleLang = "python" | "javascript" | "html" | "shell";
export type CodeChallenge = {
  kind: "code"; prompt: string; starter: string;
  solution: string; expected: string; hint: string;
};
export type QuizChallenge = {
  kind: "quiz"; question: string; options: [string,string,string,string];
  correctIndex: number; explanation: string;
};
export type LearningUnit = {
  id: string; trackId: string; title: string; objectives: string[];
  explanation: string[]; example: { lang: ExampleLang; code: string };
  challenge: CodeChallenge | QuizChallenge;
};
export type Track = { id:string; title:string; summary:string; prerequisites:string; color:string; sources:string[] };
export type Capstone = {
  id:string; trackId:string; title:string; summary:string; lang:ExampleLang;
  starter:string; steps:string[]; acceptance:string[]; resources:string[];
};
const obj = (title: string): string[] => [
  "Explicar o mecanismo de " + title.toLowerCase() + " com palavras próprias",
  "Aplicar o conceito num exemplo ou exercício independente",
];
export function codeUnit(
  trackId:string,id:string,title:string,why:string,how:string,
  lang:"python"|"javascript",example:string,prompt:string,
  solution:string,expected:string,hint:string,
): LearningUnit {
  return {
    id,trackId,title,objectives:obj(title),explanation:[why,how],
    example:{lang,code:example},
    challenge:{kind:"code",prompt,starter:lang==="python"?"# Escreva a solução abaixo\n":"// Escreva a solução abaixo\n",solution,expected,hint},
  };
}
export function quizUnit(
 trackId:string,id:string,title:string,why:string,how:string,
 lang:ExampleLang,example:string,question:string,options:[string,string,string,string],
 correctIndex:number,explanation:string,
): LearningUnit {
  return {
    id,trackId,title,objectives:obj(title),explanation:[why,how],
    example:{lang,code:example},
    challenge:{kind:"quiz",question,options,correctIndex,explanation},
  };
}
