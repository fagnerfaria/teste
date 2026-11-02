import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PROJECTS, trackById } from "@/lib/content/tracks";
import { ExampleBlock } from "@/components/ExampleBlock";
import { update, useData } from "@/lib/store";
export const Route=createFileRoute("/projetos/$id")({
 loader:({params})=>{if(!PROJECTS.some(p=>p.id===params.id))throw notFound();return {}},
 component:Projeto,
});
function Projeto(){
 const {id}=Route.useParams();
 const p=PROJECTS.find(p=>p.id===id)!;
 const d=useData();
 const done=p.steps.every((_,i)=>!!d.checklist["project:"+id+":"+i]);
 const finished=!!d.checklist["project:done:"+id];
 const toggle=(key:string,value:boolean)=>update(x=>({...x,checklist:{...x.checklist,[key]:value}}));
 return <article className="space-y-5">
  <Link to="/projetos" className="text-sm text-primary">← Todos os projetos</Link>
  <header><p className="text-sm text-primary">{trackById(p.trackId)?.title}</p><h1 className="text-3xl font-extrabold">{p.title}</h1>
   <p className="mt-2">{p.summary}</p></header>
  <section className="space-y-2"><h2 className="text-xl font-bold">Ponto de partida</h2>
   <ExampleBlock key={p.id} title="Código inicial para experimentar" lang={p.lang} code={p.starter}/>
  </section>
  <section className="card-surface space-y-3 p-4"><h2 className="text-xl font-bold">Etapas de implementação</h2>
   {p.steps.map((s,i)=>{
    const k="project:"+id+":"+i;
    return <label key={k} className="flex items-start gap-3 text-sm">
     <input type="checkbox" className="mt-1 size-4 accent-primary" checked={!!d.checklist[k]} onChange={e=>{toggle(k,e.target.checked);if(finished&&!e.target.checked)toggle("project:done:"+id,false)}}/>
     <span>{s}</span>
    </label>;
   })}
  </section>
  <section className="card-surface space-y-2 p-4"><h2 className="text-xl font-bold">Critérios de aceitação</h2>
   <ul className="ml-5 list-disc text-sm">{p.acceptance.map(a=><li key={a}>{a}</li>)}</ul>
  </section>
  <section className="card-surface space-y-2 p-4">
    <p className="text-sm">Revise o código, execute os exemplos que o laboratório suporta e confira cada critério. A marcação abaixo representa sua autoavaliação.</p>
    {finished?<p className="font-bold text-success">✔ Projeto marcado como revisado.</p>:<button className="btn btn-primary" disabled={!done} onClick={()=>toggle("project:done:"+id,true)}>Concluir após minha revisão</button>}
    {!done&&<p className="text-xs text-muted-foreground">Conclua o checklist para liberar sua revisão final.</p>}
  </section>
  <p className="text-sm">Voltar aos conceitos: <Link to="/trilhas/$id" params={{id:p.trackId}} className="font-semibold text-primary underline">{trackById(p.trackId)?.title}</Link></p>
 </article>;
}
