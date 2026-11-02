import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SQL_EXAMPLES, runSql, type SqlResult, SQL_JS_VERSION } from "@/lib/sql-runtime";
export const Route=createFileRoute("/sql")({
  head:()=>({meta:[{title:"Laboratório SQL — CódigoLab"},{name:"description",content:"Pratique SQL real em SQLite WASM com tabelas fictícias diretamente pelo Android."}]}),
  component:SqlLab,
});
function SqlLab(){
 const [idx,setIdx]=useState(0);
 const [query,setQuery]=useState<string>(SQL_EXAMPLES[0]!.query);
 const [running,setRunning]=useState(false);
 const [result,setResult]=useState<SqlResult|null>(null);
 const example=SQL_EXAMPLES[idx]!;
 const choose=(value:number)=>{setIdx(value);setQuery(SQL_EXAMPLES[value]!.query);setResult(null);};
 const exec=async()=>{
  setRunning(true);setResult(null);
  try{setResult(await runSql(query));}finally{setRunning(false);}
 };
 return <div className="space-y-5">
  <header><p className="text-sm font-bold text-primary">Laboratório profissional</p><h1 className="text-3xl font-extrabold">SQL com execução real</h1>
   <p className="mt-2 text-muted-foreground">Aprenda SELECT, WHERE, JOIN, GROUP BY e UPDATE num banco SQLite inteiramente fictício. O motor roda isolado no navegador, sem conexão a dados pessoais ou servidores externos.</p></header>
  <section className="card-surface space-y-3 p-4">
   <h2 className="font-bold">Banco didático disponível</h2>
   <p className="text-sm">Tabelas: <code>alunos (id, nome, idade, ativo)</code>, <code>cursos (id, nome)</code> e <code>matriculas (aluno_id, curso_id, nota)</code>.</p>
   <p className="text-xs text-muted-foreground">Cada execução começa com as mesmas tabelas e registros fictícios. Nenhum comando modifica seu aparelho. SQLite via sql.js {SQL_JS_VERSION}, licença MIT, carregado da CDN; a primeira execução precisa de internet.</p>
   <label className="block text-sm font-semibold">Escolha um exercício demonstrativo
    <select aria-label="Exercício SQL" className="mt-1 w-full rounded-lg border bg-background p-3" value={idx} onChange={e=>choose(Number(e.target.value))}>
      {SQL_EXAMPLES.map((item,i)=><option value={i} key={item.id}>{item.label}</option>)}
    </select>
   </label>
   <p className="text-sm">{example.description}</p>
   <label className="block text-sm font-semibold">Editor SQL
    <textarea aria-label="Editor SQL" rows={10} className="mt-2 block w-full resize-y rounded-lg border bg-background p-3 font-mono text-sm" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={query} onChange={e=>setQuery(e.target.value)}/>
   </label>
   <div className="flex flex-wrap gap-2">
    <button className="btn btn-primary" disabled={running||!query.trim()} onClick={()=>void exec()}>{running?"Executando SQL…":"▶ Executar SQL"}</button>
    <button className="btn btn-ghost" onClick={()=>{setQuery(example.query);setResult(null);}}>Restaurar exemplo</button>
   </div>
  </section>
  <section className="card-surface space-y-3 p-4">
   <h2 className="text-xl font-bold">Resultado da consulta</h2>
   {!result&&<p className="text-sm text-muted-foreground" role="status">Execute uma consulta para ver tabelas e resultados.</p>}
   {result&&<div role="status" className="space-y-3">
     <p className={result.status==="ok"?"font-semibold text-success":"font-semibold text-destructive"}>
       {result.status==="ok"?"✔ ":""}{result.message} <span className="text-xs text-muted-foreground">({result.durationMs} ms)</span>
     </p>
     {result.tables.map((table,i)=><div key={i} className="overflow-x-auto rounded-lg border">
      <table className="min-w-full border-collapse text-left text-sm"><thead className="bg-muted"><tr>{table.columns.map((col,j)=><th className="border-b p-2" key={j}>{col}</th>)}</tr></thead>
       <tbody>{table.values.map((row,j)=><tr key={j} className="border-b last:border-0">{row.map((cell,k)=><td key={k} className="p-2 font-mono text-xs">{cell===null?"NULL":String(cell)}</td>)}</tr>)}</tbody>
      </table>
      {table.truncated&&<p className="p-2 text-xs text-muted-foreground">Exibidas somente as primeiras 100 linhas.</p>}
     </div>)}
   </div>}
  </section>
  <p className="text-sm"><Link to="/trilhas/engenharia" className="font-bold text-primary underline">← Voltar à trilha de ferramentas profissionais</Link></p>
 </div>;
}
