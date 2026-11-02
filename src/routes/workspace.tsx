import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { Terminal } from "@/components/Terminal";
import { useRunner, footerFor } from "@/hooks/use-runner";
import { getData, saveDraft, useData } from "@/lib/store";
import {
  WORKSPACE_TEMPLATES, createWorkspace, parseWorkspace, validateWorkspacePath,
  upsertWorkspaceFile, removeWorkspaceFile, makeHtmlProjectPreview, prepareWorkspaceRun, prepareWorkspaceTests, PYTHON_PACKAGES,
  type Workspace, type WorkspaceKind,
} from "@/lib/workspace";

export const Route=createFileRoute("/workspace")({
  head:()=>({meta:[
    {title:"Editor de projetos web — CódigoLab"},
    {name:"description",content:"Crie projetos com múltiplos arquivos e execute Python, JavaScript ou prévia HTML e CSS no navegador."},
  ]}),
  component:WorkspacePage,
});

const keyFor=(kind:WorkspaceKind)=>"workspace:"+kind;
const load=(kind:WorkspaceKind):Workspace=>{
 const json=getData().drafts[keyFor(kind)];
 return json?parseWorkspace(json)??createWorkspace(kind):createWorkspace(kind);
};
const initial=()=>({
 web:load("web"),python:load("python"),javascript:load("javascript"),
});
function downloadFile(fileName:string,contents:string){
 const blob=new Blob([contents],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=fileName;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const editorLang=(path:string):"python"|"javascript"|"html"=>
 path.endsWith(".py")?"python":path.endsWith(".js")||path.endsWith(".ts")?"javascript":"html";

function WorkspacePage(){
 const [projects,setProjects]=useState(initial);
 const [kind,setKind]=useState<WorkspaceKind>("web");
 const [selected,setSelected]=useState<Record<WorkspaceKind,string>>({
   web:"index.html",python:"main.py",javascript:"main.js",
 });
 const [newPath,setNewPath]=useState("");
 const [feedback,setFeedback]=useState("");
 const [htmlPreview,setHtmlPreview]=useState("");
 const [preparing,setPreparing]=useState(false);
 const [savedState,setSavedState]=useState("Salvo localmente");
 const runner=useRunner();
 const data=useData();
 const project=projects[kind];
 const currentPath=selected[kind] in project.files?selected[kind]:project.entry;
 const files=Object.keys(project.files).sort((a,b)=>a===project.entry?-1:b===project.entry?1:a.localeCompare(b));
 const updateProject=(next:Workspace)=>{
   setProjects(p=>({...p,[kind]:next}));
   saveDraft(keyFor(kind),JSON.stringify(next));
   setSavedState("Salvo localmente");
 };
 const changeKind=(value:WorkspaceKind)=>{
   setKind(value);setHtmlPreview("");setFeedback("");
   runner.setChunks([]);
 };
 const changeFile=(code:string)=>{
   try{updateProject(upsertWorkspaceFile(project,currentPath,code));setFeedback("");}
   catch(e){setSavedState("Limite de armazenamento");setFeedback(e instanceof Error?e.message:"Não foi possível salvar.");}
 };
 const addFile=()=>{
   try{
     const path=validateWorkspacePath(newPath.trim());
     if(path in project.files)throw Error("Já existe um arquivo com esse nome.");
     updateProject(upsertWorkspaceFile(project,path,""));
     setSelected(p=>({...p,[kind]:path}));
     setNewPath("");setFeedback("");
   }catch(e){setFeedback(e instanceof Error?e.message:"Nome inválido.");}
 };
 const removeFile=()=>{
   if(!window.confirm("Excluir "+currentPath+" deste projeto?"))return;
   try{
     updateProject(removeWorkspaceFile(project,currentPath));
     setSelected(p=>({...p,[kind]:project.entry}));
     setFeedback("");
   }catch(e){setFeedback(e instanceof Error?e.message:"Não foi possível excluir.");}
 };
 const resetProject=()=>{
   if(!window.confirm("Restaurar projeto de exemplo e substituir os arquivos atuais? Exporte um backup antes."))return;
   updateProject(createWorkspace(kind));
   setSelected(p=>({...p,[kind]:createWorkspace(kind).entry}));
   setHtmlPreview("");runner.setChunks([]);setFeedback("Modelo restaurado.");
 };
 const importProject=async(e:ChangeEvent<HTMLInputElement>)=>{
   if(preparing||runner.running){setFeedback("Aguarde a execução antes de importar outro projeto.");e.target.value="";return;}
   const file=e.target.files?.[0];e.target.value="";
   if(!file)return;
   if(file.size>230000){setFeedback("Importação rejeitada: arquivo muito grande.");return;}
   try{
     const imported=parseWorkspace(await file.text());
     if(!imported||imported.kind!==kind)throw Error("Formato inválido ou tipo de projeto incompatível.");
     if(!window.confirm("Importar o projeto e substituir os arquivos locais atuais?"))return;
     updateProject(imported);
     setSelected(p=>({...p,[kind]:imported.entry}));
     setFeedback("Projeto importado com sucesso.");
     setHtmlPreview("");
   }catch(e){setFeedback(e instanceof Error?e.message:"Falha ao ler o arquivo.");}
 };
 const run=async(tests=false)=>{
   setFeedback("");setPreparing(true);
   try{
     if(kind==="web")setHtmlPreview(await makeHtmlProjectPreview(project));
     else{
       const prepared=await (tests?prepareWorkspaceTests(project):prepareWorkspaceRun(project));
       await runner.run(prepared.lang,prepared.code,{timeoutMs:data.timeoutMs,module:prepared.module,...(prepared.project?{project:prepared.project}:{})});
     }
   }catch(e){setFeedback(e instanceof Error?e.message:"Não foi possível preparar o projeto.");}
   finally{setPreparing(false);}
 };
 const dependencies=()=>{
   const name=kind==="python"?"requirements.txt":"package.json";
   if(!Object.hasOwn(project.files,name))updateProject(upsertWorkspaceFile(project,name,kind==="python"?"# Um pacote suportado por linha.\n":'{"dependencies":{}}\n'));
   setSelected(p=>({...p,[kind]:name}));
 };
 const setEntry=()=>{
   const next={...project,entry:currentPath};
   if(!parseWorkspace(JSON.stringify(next))){setFeedback("Selecione um arquivo principal compatível com a linguagem do projeto.");return;}
   updateProject(next);setFeedback("Arquivo principal atualizado.");
 };

 return <div className="space-y-5">
  <header className="space-y-2">
   <p className="text-sm font-semibold text-primary">Ambiente de desenvolvimento no navegador</p>
   <h1 className="text-3xl font-extrabold">Projetos e arquivos</h1>
   <p className="text-sm text-muted-foreground">
    Crie e edite arquivos como numa IDE, com projetos independentes de HTML/CSS/JS, Python e JavaScript.
    Tudo fica neste navegador, com exportação e importação em JSON. Não é necessário instalar programas.
   </p>
  </header>
  <section className="flex flex-wrap items-center gap-3">
   <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-semibold">Projeto
    <select aria-label="Projeto ativo" className="rounded-lg border bg-background p-3" value={kind}
      disabled={preparing||runner.running} onChange={e=>changeKind(e.target.value as WorkspaceKind)}>
      {WORKSPACE_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
    </select>
   </label>
   <p className="text-xs text-muted-foreground">{WORKSPACE_TEMPLATES.find(t=>t.id===kind)?.description}</p>
  </section>
  <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
   <aside className="card-surface space-y-3 p-3" aria-label="Arquivos do projeto">
    <div className="flex items-center justify-between"><h2 className="font-bold">Arquivos</h2><span className="text-xs text-muted-foreground">{files.length}/50</span></div>
    <div className="flex flex-wrap gap-1 lg:flex-col">
     {files.map(path=><button key={path} type="button" onClick={()=>setSelected(p=>({...p,[kind]:path}))}
       aria-current={path===currentPath?"true":undefined}
       className={"rounded-md border px-3 py-2 text-left font-mono text-xs break-all hover:border-primary "+(path===currentPath?"border-primary bg-secondary text-foreground":"border-transparent")}>
       {path===project.entry?"● ":""}{path}
     </button>)}
    </div>
    <form className="space-y-2" onSubmit={e=>{e.preventDefault();addFile();}}>
     <label className="block text-xs font-semibold">Novo arquivo
      <input value={newPath} onChange={e=>setNewPath(e.target.value)}
        aria-label="Nome do novo arquivo" placeholder="src/arquivo.js"
        className="mt-1 w-full rounded-md border bg-background p-2 font-mono text-xs" />
     </label>
     <button type="submit" className="btn btn-ghost w-full justify-center" disabled={!newPath.trim()}>+ Adicionar arquivo</button>
    </form>
   </aside>
   <section className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <div><h2 className="font-bold">{currentPath}</h2><p className="text-xs text-muted-foreground">{savedState} · principal: {project.entry}</p></div>
     <div className="flex flex-wrap gap-2"><button className="btn btn-ghost text-xs" disabled={currentPath===project.entry||preparing} onClick={setEntry}>Definir como principal</button><button className="btn btn-ghost text-xs" disabled={currentPath===project.entry||preparing} onClick={removeFile}>Excluir arquivo</button></div>
    </div>
    {/\.(?:py|js|ts|html)$/i.test(currentPath)?
     <CodeEditor key={kind+":"+currentPath} value={project.files[currentPath]??""} onChange={changeFile} lang={editorLang(currentPath)}
       minHeight={340} label={"Editor "+currentPath}/>:
     <textarea aria-label={"Editor "+currentPath} value={project.files[currentPath]??""} onChange={e=>changeFile(e.target.value)}
       className="min-h-80 w-full resize-y rounded-lg border bg-card p-4 font-mono text-sm" spellCheck={false}/>}
    <div className="flex flex-wrap gap-2">
     <button onClick={()=>void run()} disabled={runner.running||preparing} className="btn btn-primary">
      {preparing&&!runner.running?"Preparando projeto…":runner.running?"Executando…":kind==="web"?"▶ Atualizar prévia":"▶ Executar arquivo principal"}
     </button>
     {kind!=="web"&&<button className="btn btn-ghost" disabled={preparing||runner.running} onClick={()=>void run(true)}>✓ Executar testes do projeto</button>}
     {kind!=="web"&&<button className="btn btn-ghost" disabled={preparing} onClick={dependencies}>Dependências</button>}
     {kind!=="web"&&runner.running&&<button className="btn btn-danger" onClick={runner.stop}>■ Parar</button>}
     <button onClick={()=>downloadFile("codigolab-"+kind+".json",JSON.stringify(project,null,2))} className="btn btn-ghost">Exportar projeto</button>
     <label className="btn btn-ghost cursor-pointer">
       Importar projeto
       <input aria-label="Importar arquivo JSON do projeto" type="file" accept=".json,application/json" className="sr-only" onChange={e=>void importProject(e)}/>
     </label>
     <button onClick={resetProject} disabled={preparing||runner.running} className="btn btn-ghost">Restaurar modelo</button>
    </div>
    {!!feedback&&<p role="status" className="rounded-lg border p-3 text-sm">{feedback}</p>}
    {kind==="web"?<div className="space-y-2">
      <h3 className="font-bold">Prévia interativa</h3>
      <iframe sandbox="allow-scripts" title="Prévia isolada do projeto web" srcDoc={htmlPreview}
       className="h-80 w-full rounded-lg border bg-white"/>
      <p className="text-xs text-muted-foreground">HTML, CSS e JavaScript dos arquivos do projeto são combinados em iframe sem acesso à origem do CódigoLab, rede ou dados locais. Clique em Atualizar prévia.</p>
    </div>:
    <div className="space-y-2"><h3 className="font-bold">Saída do executor</h3>
      <Terminal chunks={runner.chunks} footer={footerFor(runner.last)}/>
      <p className="text-xs text-muted-foreground">Executa {project.entry} e seus imports locais reais. Testes Python usam unittest; JavaScript usa arquivos .test.js/.test.ts. Dependências npm exigem versão exata em package.json e podem requerer rede. Python aceita requirements.txt com pacotes Pyodide. O limite de execução é {data.timeoutMs/1000} segundos.</p>
      {kind==="python"&&<p className="text-xs text-muted-foreground">Pacotes Python suportados: {PYTHON_PACKAGES.join(", ")}. Versões fixadas pelo Pyodide; o primeiro download de pacotes requer internet.</p>}
    </div>}
   </section>
  </div>
  <p className="text-xs text-muted-foreground">Limites: 50 arquivos por projeto, 50 mil caracteres por arquivo e 200 mil no total. O projeto permanece local e não é sincronizado automaticamente. Exporte um backup antes de limpar o navegador.</p>
  <Link to="/projetos" className="text-sm font-semibold text-primary underline">← Projetos orientados e critérios de aceitação</Link>
 </div>;
}
