/** Laboratório SQL real: SQLite WASM isolado em Web Worker descartável.
 * sql.js v1.14.2 (MIT) e SQLite (domínio público). Dados sempre fictícios.
 * Sem servidor, contas, tokens ou acesso aos arquivos do aparelho.
 */
export const SQL_JS_VERSION = "1.14.2";
const SQL_JS_CDN = typeof location !== "undefined" ? new URL("/vendor/sql/", location.href).href : "http://localhost/vendor/sql/";
export const SQL_SEED = [
 "CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, idade INTEGER NOT NULL, ativo INTEGER NOT NULL);",
 "INSERT INTO alunos VALUES (1,'Ana',24,1),(2,'Beto',19,1),(3,'Clara',32,0),(4,'Diego',27,1);",
 "CREATE TABLE cursos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL);",
 "INSERT INTO cursos VALUES (1,'Python'),(2,'JavaScript'),(3,'SQL');",
 "CREATE TABLE matriculas (aluno_id INTEGER, curso_id INTEGER, nota REAL, FOREIGN KEY(aluno_id) REFERENCES alunos(id),FOREIGN KEY(curso_id) REFERENCES cursos(id));",
 "INSERT INTO matriculas VALUES (1,1,9.0),(1,3,8.5),(2,2,7.0),(3,3,8.0),(4,1,6.5),(4,3,9.5);",
].join("\n");

export const SQL_EXAMPLES = [
 {id:"selecao",label:"01 · Consultar tabela",description:"SELECT lê dados. ORDER BY organiza a saída.",query:"SELECT id, nome, idade FROM alunos ORDER BY idade DESC;"},
 {id:"filtro",label:"02 · Filtrar registros",description:"WHERE seleciona linhas que satisfazem uma condição.",query:"SELECT nome, idade FROM alunos WHERE ativo = 1 AND idade >= 21 ORDER BY nome;"},
 {id:"agregacao",label:"03 · Agrupar notas",description:"JOIN relaciona tabelas; GROUP BY agrega as linhas.",query:"SELECT cursos.nome AS curso, ROUND(AVG(matriculas.nota),2) AS media\nFROM matriculas\nJOIN cursos ON matriculas.curso_id = cursos.id\nGROUP BY cursos.id ORDER BY media DESC;"},
 {id:"join",label:"04 · Relacionar tabelas",description:"JOIN combina informações de alunos, cursos e matrículas.",query:"SELECT alunos.nome AS aluno, cursos.nome AS curso, matriculas.nota\nFROM matriculas JOIN alunos ON matriculas.aluno_id = alunos.id\nJOIN cursos ON matriculas.curso_id = cursos.id\nORDER BY aluno, curso;"},
 {id:"modificacao",label:"05 · Atualizar dados fictícios",description:"UPDATE modifica somente o banco temporário desta execução.",query:"UPDATE alunos SET ativo = 1 WHERE nome = 'Clara';\nSELECT nome, ativo FROM alunos ORDER BY nome;"},
] as const;

export type SqlResult = {
 status:"ok"|"error"|"timeout"|"unavailable";
 tables: Array<{columns:string[];values:(string|number|null)[][];truncated:boolean}>;
 message:string;
 durationMs:number;
};

const createWorkerSource=() => [
 "self.onmessage=async function(evt){",
 "try{",
 "importScripts("+JSON.stringify(SQL_JS_CDN+"sql-wasm.js")+");",
 "if(typeof initSqlJs!=='function') throw Error('Motor SQL não foi carregado');",
 "const SQL=await initSqlJs({locateFile:function(file){return "+JSON.stringify(SQL_JS_CDN)+"+file;}});",
 "const db=new SQL.Database();",
 "try{db.run("+JSON.stringify(SQL_SEED)+");",
 "const result=db.exec(evt.data.sql);",
 "const tables=result.map(function(t){return {columns:t.columns,values:t.values.slice(0,100),truncated:t.values.length>100};});",
 "self.postMessage({status:'ok',tables:tables,message:result.length?'Consulta executada.':'Comando executado sem linhas retornadas.'});",
 "}finally{db.close();}",
 "}catch(error){self.postMessage({status:'error',tables:[],message:String(error&&error.message||error).slice(0,700)});}",
 "};",
].join("\n");

export function runSql(query:string,timeoutMs=10000):Promise<SqlResult> {
 const start=performance.now();
 if(!query.trim()||query.length>12000) return Promise.resolve({
   status:"error",tables:[],message:"Digite uma consulta de até 12.000 caracteres.",durationMs:0,
 });
 if(typeof Worker==="undefined")return Promise.resolve({
   status:"unavailable",tables:[],message:"Este navegador não oferece Web Workers.",durationMs:0,
 });
 return new Promise(resolve=>{
   let worker:Worker|null=null;
   let done=false;
   let timer:ReturnType<typeof setTimeout>|undefined;
   let blobUrl:string|undefined;
   const finish=(result:Omit<SqlResult,"durationMs">)=>{
     if(done)return;
     done=true;
     if(timer)clearTimeout(timer);
     worker?.terminate();
     if(blobUrl)URL.revokeObjectURL(blobUrl);
     resolve({...result,durationMs:Math.round(performance.now()-start)});
   };
   try{
     const blob=new Blob([createWorkerSource()],{type:"text/javascript"});
     blobUrl=URL.createObjectURL(blob);
     worker=new Worker(blobUrl);
     worker.onmessage=e=>{
       const data=e.data as Partial<SqlResult>;
       finish({
         status:data.status==="ok"?"ok":"error",
         tables:Array.isArray(data.tables)?data.tables:[],
         message:typeof data.message==="string"?data.message:"Resultado inválido do motor SQL.",
       });
     };
     worker.onerror=e=>{e.preventDefault();finish({status:"unavailable",tables:[],message:"Falha ao iniciar SQLite. Confira a conexão com a biblioteca gratuita."});};
     timer=setTimeout(()=>finish({status:"timeout",tables:[],message:"Tempo limite atingido; execução SQL interrompida."}),Math.max(1000,Math.min(timeoutMs,20000)));
     worker.postMessage({sql:query});
   }catch(error){
     finish({status:"unavailable",tables:[],message:"Motor SQL indisponível: "+String(error).slice(0,250)});
   }
 });
}
