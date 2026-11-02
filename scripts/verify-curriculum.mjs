import { spawnSync } from "node:child_process";
import { Script, createContext } from "node:vm";
import assert from "node:assert/strict";
import { UNITS } from "../src/lib/content/tracks.ts";
const normalize=(str)=>str.replace(/\r\n?/g,"\n").split("\n").map(l=>l.replace(/\s+$/,"")).join("\n").replace(/\n+$/,"");
const codeUnits=UNITS.filter(u=>u.challenge.kind==="code");
let errors=[];
for(const unit of codeUnits){
 const {lang}=unit.example;
 const code=unit.challenge.solution;
 const expected=normalize(unit.challenge.expected);
 let actual="",err="";
 if(lang==="python"){
   const p=spawnSync("python3",["-I","-c",code],{encoding:"utf8",timeout:3000,env:{PATH:process.env.PATH}});
   actual=normalize(p.stdout||"");err=p.error?.message||(p.status===0?"":p.stderr||"erro");
 }else if(lang==="javascript"){
   const lines=[];
   const scope=createContext({console:{log:(...args)=>lines.push(args.join(" "))}});
   try{const promise=new Script("(async()=>{\n"+code+"\n})()",{filename:unit.id}).runInContext(scope,{timeout:1000});await promise;actual=normalize(lines.join("\n"));}catch(e){err=String(e);}
 }else err="Linguagem não executável do desafio";
 if(err||actual!==expected) errors.push({id:unit.id,lang,err,actual,expected});
}
for(const item of errors)console.error("FALHOU",JSON.stringify(item));
assert.equal(errors.length,0,"As soluções do currículo devem realmente produzir as saídas esperadas");
assert.ok(codeUnits.length>=15,"Deve haver ao menos 15 atividades de código executável");
console.log("VERIFICADO:",codeUnits.length,"soluções Python/JavaScript; saídas reais coincidem com os testes.");
