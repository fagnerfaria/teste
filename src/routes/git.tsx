import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GIT_STEPS, validateBranchName } from "@/lib/git-lessons";

export const Route=createFileRoute("/git")({
 head:()=>({meta:[
  {title:"Laboratório Git local — CódigoLab"},
  {name:"description",content:"Pratique commits, branches, índice e histórico Git reais no seu navegador, sem credenciais."},
 ]}),
 component:GitLab,
});

type GitModule=typeof import("isomorphic-git");
type BrowserFS=InstanceType<typeof import("@isomorphic-git/lightning-fs").default>;
type Context={git:GitModule;fs:BrowserFS};
const DIR="/tutorial";
const FILE="README.md";
const starter="# Meu projeto CódigoLab\n\nEste repositório fica somente neste navegador.\n";
const identity={name:"Estudante CódigoLab",email:"aluno@codigolab.invalid"};

function GitLab(){
 const context=useRef<Context|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [content,setContent]=useState(starter);
 const [branch,setBranch]=useState("main");
 const [branches,setBranches]=useState<string[]>([]);
 const [status,setStatus]=useState("Preparando repositório…");
 const [message,setMessage]=useState("Explica a alteração do arquivo");
 const [newBranch,setNewBranch]=useState("feature/testes");
 const [history,setHistory]=useState<Array<{oid:string;message:string;author:string}>>([]);

 const refresh=async(ctx:Context)=>{
  const {fs,git}=ctx;
  const [text,ref,listed,stat,commits]=await Promise.all([
   fs.promises.readFile(DIR+"/"+FILE,"utf8"),
   git.currentBranch({fs,dir:DIR,fullname:false}),
   git.listBranches({fs,dir:DIR}),
   git.status({fs,dir:DIR,filepath:FILE}),
   git.log({fs,dir:DIR,depth:10}),
  ]);
  setContent(String(text));
  setBranch(ref??"main");
  setBranches(listed);
  setStatus(stat);
  setHistory(commits.map(c=>({oid:c.oid,message:c.commit.message,author:c.commit.author.name})));
 };

 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const [{default: LightningFS},git]=await Promise.all([
     import("@isomorphic-git/lightning-fs"),import("isomorphic-git"),
    ]);
    const fs=new LightningFS("codigolab-git-tutorial-v1");
    const ctx={fs,git};
    context.current=ctx;
    try{await fs.promises.mkdir(DIR);}catch{/* Diretório já existe */}
    let exists=false;
    try{await fs.promises.stat(DIR+"/.git");exists=true;}catch{/* Inicia novo repositório */}
    if(!exists){
     await git.init({fs,dir:DIR,defaultBranch:"main"});
     await fs.promises.writeFile(DIR+"/"+FILE,starter,"utf8");
     await git.add({fs,dir:DIR,filepath:FILE});
     await git.commit({fs,dir:DIR,author:identity,message:"Primeiro commit: adiciona README"});
    }
    if(active)await refresh(ctx);
   }catch(e){if(active)setError(e instanceof Error?e.message:"Não foi possível iniciar Git local.");}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[]);

 const run=(fn:(ctx:Context)=>Promise<string>)=>{
  const ctx=context.current;
  if(!ctx||busy)return;
  setBusy(true);setError("");setNotice("");
  void (async()=>{
   try{
    const result=await fn(ctx);
    await refresh(ctx);
    setNotice(result);
   }catch(e){setError(e instanceof Error?e.message:String(e));}
   finally{setBusy(false);}
  })();
 };

 const save=()=>{
  run(async({fs})=>{
   if(content.length>50000)throw Error("README excede 50 mil caracteres.");
   await fs.promises.writeFile(DIR+"/"+FILE,content,"utf8");
   return "Arquivo salvo no diretório de trabalho. Use git add para preparar a mudança.";
  });
 };
 const stage=()=>run(async({fs,git})=>{
  await git.add({fs,dir:DIR,filepath:FILE});
  return "git add README.md executado. Alteração preparada para commit.";
 });
 const commit=()=>run(async({fs,git})=>{
  if(!message.trim()||message.length>150)throw Error("Informe uma mensagem de commit com até 150 caracteres.");
  const status=await git.status({fs,dir:DIR,filepath:FILE});
  if(status==="unmodified"||status==="*modified"||status==="*added")throw Error("Prepare a alteração com git add antes do commit.");
  const hash=await git.commit({fs,dir:DIR,message:message.trim(),author:identity});
  return "Commit registrado: "+hash.slice(0,10)+". Histórico atualizado.";
 });
 const createBranch=()=>run(async({fs,git})=>{
  const name=validateBranchName(newBranch);
  const list=await git.listBranches({fs,dir:DIR});
  if(list.includes(name))throw Error("Esta branch já existe.");
  await git.branch({fs,dir:DIR,ref:name});
  return "Branch "+name+" criada. Use Alternar para mudar o HEAD.";
 });
 const checkout=(target:string)=>run(async({fs,git})=>{
  const st=await git.status({fs,dir:DIR,filepath:FILE});
  if(st!=="unmodified")throw Error("Salve e registre as alterações antes de alternar branches.");
  await git.checkout({fs,dir:DIR,ref:target});
  return "HEAD apontando para "+target+".";
 });

 return <div className="space-y-5">
  <header>
   <p className="text-sm font-bold text-primary">Ferramenta profissional · execução verdadeira</p>
   <h1 className="text-3xl font-extrabold">Laboratório Git local</h1>
   <p className="mt-2 text-sm text-muted-foreground">
    Aqui você pratica comandos Git reais, sem instalar terminal ou vincular sua conta GitHub.
    Os dados ficam no armazenamento IndexedDB do navegador. Não há push, clone ou acesso a repositórios remotos.
   </p>
  </header>
  {loading?<p role="status" className="card-surface p-4">Iniciando Git e o sistema de arquivos local…</p>:null}
  {error?<p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>:null}
  {notice?<p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>:null}
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
   <section className="card-surface space-y-3 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <h2 className="text-lg font-bold">Arquivo de trabalho: {FILE}</h2>
     <span className="rounded bg-secondary px-3 py-1 text-xs font-semibold">Branch: {branch}</span>
    </div>
    <label className="block text-sm font-semibold">Conteúdo do README.md
     <textarea aria-label="Conteúdo do README.md" rows={9} value={content} onChange={e=>setContent(e.target.value)}
       disabled={loading||busy} className="mt-2 w-full resize-y rounded-lg border bg-background p-3 font-mono text-sm" spellCheck={false}/>
    </label>
    <div className="flex flex-wrap gap-2">
     <button className="btn btn-primary" disabled={loading||busy} onClick={save}>Salvar arquivo</button>
     <button className="btn btn-ghost" disabled={loading||busy} onClick={stage}>git add README.md</button>
    </div>
    <p className="text-sm"><strong>git status README.md:</strong> <code className="ml-2 rounded bg-muted px-2 py-1">{status}</code></p>
    <p className="text-xs text-muted-foreground">Ao editar o textarea, clique em Salvar arquivo. Em seguida use git add, escreva a mensagem de commit e registre a mudança.</p>
    <div className="border-t pt-3">
     <label className="block text-sm font-semibold">Mensagem do novo commit
      <input aria-label="Mensagem do commit" value={message} onChange={e=>setMessage(e.target.value)} disabled={loading||busy}
       className="mt-1 w-full rounded-lg border bg-background p-3 text-sm"/>
     </label>
     <button className="btn btn-primary mt-2" disabled={loading||busy} onClick={commit}>git commit</button>
    </div>
    <div className="border-t pt-3">
     <h3 className="mb-2 font-bold">Branches</h3>
     <label className="block text-sm font-semibold">Nova branch
      <input aria-label="Nome da branch" value={newBranch} onChange={e=>setNewBranch(e.target.value)} disabled={loading||busy}
       className="mt-1 w-full rounded-lg border bg-background p-3 font-mono text-sm"/>
     </label>
     <button className="btn btn-ghost mt-2" disabled={loading||busy} onClick={createBranch}>git branch · criar</button>
     <div className="mt-3 flex flex-wrap gap-2">
      {branches.map(name=><button className="btn btn-ghost text-xs" key={name} disabled={loading||busy||name===branch}
        onClick={()=>checkout(name)}>{name===branch?"● ":"⇄ "}{name}</button>)}
     </div>
    </div>
   </section>
   <aside className="card-surface space-y-3 p-4">
    <h2 className="font-bold">Guia de comandos</h2>
    <ol className="space-y-3">
     {GIT_STEPS.map((s,i)=><li key={s.id} className="space-y-1 border-b pb-2 last:border-0">
      <p className="text-sm font-semibold">{i+1}. {s.title}</p>
      <code className="block break-all rounded bg-muted p-2 text-xs">{s.command}</code>
      <p className="text-xs text-muted-foreground">{s.detail}</p>
     </li>)}
    </ol>
   </aside>
  </div>
  <section className="card-surface p-4">
   <h2 className="text-lg font-bold">Histórico git log</h2>
   <ol className="mt-3 space-y-2">
    {history.map(commit=><li className="flex flex-wrap items-start gap-2 border-b pb-2 text-sm" key={commit.oid}>
     <code className="rounded bg-muted px-2 py-1">{commit.oid.slice(0,9)}</code>
     <span className="flex-1">{commit.message}</span>
    </li>)}
   </ol>
  </section>
  <p className="text-xs text-muted-foreground">
   Git real via isomorphic-git e LightningFS (licenças MIT), apenas no seu navegador. Reinstalar o navegador, limpar armazenamento IndexedDB ou usar outro dispositivo pode apagar este repositório local. Sem rede, push ou autenticação.
  </p>
  <Link to="/trilhas/engenharia" className="text-sm font-semibold text-primary underline">← Voltar à trilha de ferramentas profissionais</Link>
 </div>;
}
